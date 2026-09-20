from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from typing import Optional
from ..schemas import (
    DataSummaryResponse,
    DataMetadataResponse,
    DataQualityReport,
    HistoricalDataResponse
)
from ..config import SUPPORTED_TARGETS
from ..services.data_service import data_service
from ..services.aggregation_service import aggregate_time_series, df_to_historical_points
from ..utils.logger import get_logger

logger = get_logger("routes_data")
router = APIRouter(prefix="/data", tags=["Data"])

@router.get("/summary", response_model=DataSummaryResponse)
def get_data_summary():
    """Returns dataset summary, row counts, date ranges, and quality report."""
    try:
        return data_service.get_data_summary()
    except Exception as e:
        logger.error(f"Error getting data summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metadata", response_model=DataMetadataResponse)
def get_metadata():
    """Returns lists of insurers, categories, forecasting levels, and available targets."""
    try:
        return data_service.get_metadata()
    except Exception as e:
        logger.error(f"Error getting metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quality-report", response_model=DataQualityReport)
def get_quality_report():
    """Returns detailed audit data-quality report."""
    try:
        return data_service.get_quality_report()
    except Exception as e:
        logger.error(f"Error getting quality report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/historical", response_model=HistoricalDataResponse)
def get_historical_data(
    level: str = Query("industry", description="industry | insurer | category | insurer_category"),
    insurer: Optional[str] = Query(None, description="Insurer name"),
    category: Optional[str] = Query(None, description="Category name"),
    target: str = Query("premium_month_cr", description="premium_month_cr | policies_month"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-01"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-01")
):
    """Returns monthly historical time-series data for the selected level, entity, and target."""
    try:
        df = data_service.get_processed_df()
        agg_df, _ = aggregate_time_series(
            df=df,
            level=level,
            target=target,
            insurer=insurer,
            category=category
        )

        if start_date:
            agg_df = agg_df[agg_df["date"] >= start_date]
        if end_date:
            agg_df = agg_df[agg_df["date"] <= end_date]

        points = df_to_historical_points(agg_df, target)
        target_unit = SUPPORTED_TARGETS.get(target, {}).get("unit", "")

        return HistoricalDataResponse(
            level=level,
            insurer=insurer,
            category=category,
            target=target,
            target_unit=target_unit,
            count=len(points),
            data=points
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error retrieving historical data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Accepts a custom CSV dataset, parses, standardizes, profiles, and activates it."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    
    try:
        content = await file.read()
        summary, warnings = data_service.load_custom_csv(content, file.filename)
        return {
            "message": f"Dataset '{file.filename}' successfully uploaded and preprocessed.",
            "summary": summary,
            "warnings": warnings
        }
    except Exception as e:
        logger.error(f"Error processing uploaded CSV: {e}")
        raise HTTPException(status_code=400, detail=str(e))
