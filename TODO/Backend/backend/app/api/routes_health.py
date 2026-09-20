from fastapi import APIRouter
from ..schemas import HealthResponse
from ..services.data_service import data_service
from .. import __version__

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint returning system status and data availability."""
    has_data = False
    records = 0
    try:
        df = data_service.get_processed_df()
        has_data = not df.empty
        records = len(df)
    except Exception:
        has_data = False
        records = 0

    return HealthResponse(
        status="healthy",
        version=__version__,
        dataset_loaded=has_data,
        dataset_records=records,
        data_source=str(data_service._active_file_path.name)
    )
