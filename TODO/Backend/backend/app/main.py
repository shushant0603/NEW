import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS, HOST, PORT
from .api.routes_health import router as health_router
from .api.routes_data import router as data_router
from .api.routes_forecast import router as forecast_router
from .api.routes_analytics import router as analytics_router
from .services.data_service import data_service
from .utils.logger import get_logger

logger = get_logger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Insurance Intelligence Forecasting API...")
    try:
        data_service.initialize_data()
        logger.info("Initial dataset successfully loaded and preprocessed.")
        from .models import model_manager, MODEL_REGISTRY
        from .services.evaluation_service import build_monthly_error_analysis
        from .services.aggregation_service import aggregate_time_series
        for label in ["industry_premium", "industry_policies"]:
            for key in ["seasonal_naive", "linear_regression", "sarima", "prophet", "lstm"]:
                model_manager.load_model(label, key)
        logger.info("Pre-trained .pkl model artifacts pre-warmed into memory cache.")
        
        # Pre-warm monthly error analysis for instant UI response
        df = data_service.get_processed_df()
        for target in ["premium_month_cr", "policies_month"]:
            agg_df, _ = aggregate_time_series(df=df, level="industry", target=target)
            s = agg_df["target_value"]
            d = agg_df["date"]
            for m_key in ["seasonal_naive", "linear_regression", "sarima", "prophet", "lstm"]:
                m_cls = MODEL_REGISTRY.get(m_key)
                if m_cls:
                    build_monthly_error_analysis(s, d, m_key, m_cls)
        logger.info("Test period error analyses pre-warmed into memory cache.")
    except Exception as e:
        logger.warning(f"Initial startup warning: {e}")
    yield
    logger.info("Shutting down Insurance Intelligence Forecasting API...")

app = FastAPI(
    title="Insurance Intelligence: Life Insurance New Business Forecasting Platform",
    description=(
        "Production-quality AI/ML Forecasting Platform for Life Insurance New Business Premium "
        "and Policy Counts. Supports Industry, Insurer, and Category level time-series modeling, "
        "holdout validation (MAE, RMSE, sMAPE), and automated insights."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(data_router, prefix="/api")
app.include_router(forecast_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")

@app.get("/")
def root():
    return {
        "platform": "Insurance Intelligence: Life Insurance New Business Forecasting Platform",
        "status": "operational",
        "docs": "/docs",
        "api_health": "/api/health"
    }

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host=HOST, port=PORT, reload=True)
