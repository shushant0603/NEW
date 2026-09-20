from fastapi import APIRouter, HTTPException, Response
from ..schemas import (
    ForecastRequest,
    ForecastResponse,
    ModelComparisonRequest,
    ModelComparisonResponse
)
from ..services.forecasting_service import forecasting_service
from ..services.export_service import export_service
from ..utils.logger import get_logger

logger = get_logger("routes_forecast")
router = APIRouter(tags=["Forecasting"])

@router.post("/forecast", response_model=ForecastResponse)
def generate_forecast(req: ForecastRequest):
    """Generates multi-month life insurance forecasts with confidence bounds and model validation."""
    try:
        return forecasting_service.generate_forecast(req)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Forecasting error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Forecasting pipeline error: {str(e)}")

@router.post("/forecast/compare", response_model=ModelComparisonResponse)
def compare_forecasting_models(req: ModelComparisonRequest):
    """Compares all time-series models on historical chronological holdout test data."""
    try:
        return forecasting_service.compare_models(req)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Model comparison error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Model comparison pipeline error: {str(e)}")

@router.post("/export/forecast")
def export_forecast(req: ForecastRequest):
    """Generates forecast and returns it as a downloadable CSV file."""
    try:
        forecast_res = forecasting_service.generate_forecast(req)
        csv_content = export_service.export_forecast_to_csv(forecast_res)

        filename = f"forecast_{req.level}_{req.target}_{req.horizon}m.csv"
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Export error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}")
