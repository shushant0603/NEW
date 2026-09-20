import os
from pathlib import Path

# Paths
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
ROOT_DIR = BACKEND_DIR.parent

DATA_DIR = ROOT_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
MODELS_DIR = ROOT_DIR / "models"

RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_CSV_PATH = PROCESSED_DATA_DIR / "life_insurance_nbp_consolidated.csv"

# Chronological Time-Series Split Configuration (128 observations)
CONFIRMED_TOTAL_MONTHS = 128
TRAIN_OBSERVATIONS = 90    # Jan 2016 – Jun 2023 (~70.3%)
VAL_OBSERVATIONS = 19      # Jul 2023 – Jan 2025 (~14.8%)
TEST_OBSERVATIONS = 19     # Feb 2025 – Aug 2026 (~14.8%)
FORECAST_HORIZON = 24      # Sep 2026 – Aug 2028 (24 months)

# Forecasting Configuration
DEFAULT_TARGET = "premium_month_cr"
SUPPORTED_TARGETS = {
    "premium_month_cr": {
        "display_name": "New Business Premium",
        "unit": "₹ Crore",
        "format": "currency"
    },
    "policies_month": {
        "display_name": "Number of Policies",
        "unit": "Number of Policies",
        "format": "integer"
    }
}

SUPPORTED_HORIZONS = [3, 6, 12, 18, 24]
DEFAULT_HORIZON = 24

SUPPORTED_LEVELS = [
    "industry",
    "insurer",
    "category",
    "insurer_category"
]

# Server Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]
