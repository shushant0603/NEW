import io
import os
import shutil
import pandas as pd
from pathlib import Path
from typing import Optional, Tuple, Dict, Any, List

from ..config import DEFAULT_CSV_PATH, PROCESSED_DATA_DIR, SUPPORTED_TARGETS, SUPPORTED_HORIZONS, SUPPORTED_LEVELS
from ..schemas import (
    DataSummaryResponse,
    DataMetadataResponse,
    DataQualityReport,
    TargetInfo
)
from .preprocessing_service import preprocess_life_insurance_data, is_aggregate_insurer_name
from ..utils.logger import get_logger

logger = get_logger("data_service")

class DataService:
    def __init__(self):
        self._raw_df: Optional[pd.DataFrame] = None
        self._processed_df: Optional[pd.DataFrame] = None
        self._quality_report: Optional[DataQualityReport] = None
        self._active_file_path: Path = DEFAULT_CSV_PATH
        self.initialize_data()

    def initialize_data(self):
        """Loads and preprocesses dataset from the active CSV path."""
        if not self._active_file_path.exists():
            logger.warning(f"CSV file not found at {self._active_file_path}")
            return
        
        try:
            logger.info(f"Loading raw CSV data from {self._active_file_path}...")
            # Try reading with common encodings
            try:
                self._raw_df = pd.read_csv(self._active_file_path, encoding="utf-8")
            except UnicodeDecodeError:
                self._raw_df = pd.read_csv(self._active_file_path, encoding="latin1")

            self._processed_df, self._quality_report = preprocess_life_insurance_data(self._raw_df)
            
            # Cache processed data locally
            processed_cache_file = PROCESSED_DATA_DIR / "current_processed_data.csv"
            self._processed_df.to_csv(processed_cache_file, index=False)
            logger.info(f"Dataset successfully initialized with {len(self._processed_df)} processed rows.")
        except Exception as e:
            logger.error(f"Error during dataset initialization: {e}", exc_info=True)
            raise

    def get_processed_df(self) -> pd.DataFrame:
        if self._processed_df is None or self._processed_df.empty:
            self.initialize_data()
        if self._processed_df is None or self._processed_df.empty:
            raise RuntimeError("No life insurance dataset is currently loaded.")
        return self._processed_df

    def get_quality_report(self) -> DataQualityReport:
        if self._quality_report is None:
            self.initialize_data()
        return self._quality_report

    def get_data_summary(self) -> DataSummaryResponse:
        df = self.get_processed_df()
        q_report = self.get_quality_report()

        unique_insurers = [ins for ins in df["insurer"].dropna().unique().tolist() if not is_aggregate_insurer_name(ins)]
        unique_categories = df["category"].dropna().unique().tolist()
        targets = list(SUPPORTED_TARGETS.keys())

        return DataSummaryResponse(
            rows=len(df),
            columns=len(df.columns),
            date_range=q_report.date_range,
            num_insurers=len(unique_insurers),
            num_categories=len(unique_categories),
            available_targets=targets,
            quality_report=q_report
        )

    def get_metadata(self) -> DataMetadataResponse:
        df = self.get_processed_df()
        q_report = self.get_quality_report()

        all_insurers = sorted(df["insurer"].dropna().unique().tolist())
        detailed_insurers = [ins for ins in all_insurers if not is_aggregate_insurer_name(ins)]
        aggregate_insurers = [ins for ins in all_insurers if is_aggregate_insurer_name(ins)]
        categories = sorted(df["category"].dropna().unique().tolist())

        target_infos = [
            TargetInfo(
                key=k,
                display_name=v["display_name"],
                unit=v["unit"],
                format=v["format"]
            )
            for k, v in SUPPORTED_TARGETS.items()
        ]

        return DataMetadataResponse(
            insurers=detailed_insurers,
            categories=categories,
            forecasting_levels=SUPPORTED_LEVELS,
            date_range=q_report.date_range,
            available_targets=target_infos,
            available_horizons=SUPPORTED_HORIZONS,
            aggregate_insurers=aggregate_insurers
        )

    def load_custom_csv(self, file_bytes: bytes, filename: str) -> Tuple[DataSummaryResponse, List[str]]:
        """Handles uploading and preprocessing of a custom user CSV file."""
        warnings: List[str] = []
        try:
            # Save raw uploaded file
            uploaded_path = DEFAULT_CSV_PATH.parent / f"uploaded_{filename}"
            with open(uploaded_path, "wb") as f:
                f.write(file_bytes)
            
            # Read and validate
            try:
                uploaded_df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8")
            except UnicodeDecodeError:
                uploaded_df = pd.read_csv(io.BytesIO(file_bytes), encoding="latin1")

            new_processed_df, new_quality_report = preprocess_life_insurance_data(uploaded_df)
            
            # Update state
            self._active_file_path = uploaded_path
            self._raw_df = uploaded_df
            self._processed_df = new_processed_df
            self._quality_report = new_quality_report

            summary = self.get_data_summary()
            warnings.extend(new_quality_report.warnings)
            return summary, warnings
        except Exception as e:
            logger.error(f"Failed to load uploaded CSV: {e}", exc_info=True)
            raise ValueError(f"Failed to process uploaded CSV: {str(e)}")

# Singleton instance
data_service = DataService()
