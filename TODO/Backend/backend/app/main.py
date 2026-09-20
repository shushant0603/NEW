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
        from .models import model_manager
        for label in ["industry_premium", "industry_policies"]:
            for key in ["seasonal_naive", "linear_regression", "sarima", "prophet", "lstm"]:
                model_manager.load_model(label, key)
        logger.info("Pre-trained .pkl model artifacts pre-warmed into memory cache.")
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
