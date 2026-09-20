from fastapi import APIRouter, HTTPException
from ..schemas import AnalyticsTrendsResponse
from ..services.analytics_service import analytics_service
from ..utils.logger import get_logger

logger = get_logger("routes_analytics")
router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/trends", response_model=AnalyticsTrendsResponse)
def get_analytics_trends():
    """Returns exploratory analytics, historical trends, insurer rankings, and calculated insights."""
    try:
        return analytics_service.get_trends_and_insights()
    except Exception as e:
        logger.error(f"Error fetching analytics trends: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
