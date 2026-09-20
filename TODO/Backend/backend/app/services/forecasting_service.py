import os
import pickle
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

from ..config import SUPPORTED_TARGETS
from ..schemas import (
    ForecastRequest,
    ForecastResponse,
    ForecastDataPoint,
    ModelComparisonRequest,
    ModelComparisonResponse
)
from ..models import MODEL_REGISTRY, model_manager
from .data_service import data_service
from .aggregation_service import aggregate_time_series, df_to_historical_points
from .evaluation_service import evaluate_models_on_series, build_monthly_error_analysis
from ..utils.date_utils import generate_future_dates, format_display_month
from ..utils.logger import get_logger

logger = get_logger("forecasting_service")

# Path to pre-trained model artifacts
MODELS_DIR = model_manager.models_dir
EVAL_REPORT_PATH = os.path.join(MODELS_DIR, "evaluation_report.csv")

NAME_TO_KEY = {
    "seasonal naive": "seasonal_naive",
    "seasonal_naive": "seasonal_naive",
    "naive": "seasonal_naive",
    "linear regression (time features)": "linear_regression",
    "linear_regression": "linear_regression",
    "linear regression": "linear_regression",
    "sarima": "sarima",
    "prophet": "prophet",
    "lstm": "lstm",
}

# Cache: evaluation report dataframe
_EVAL_CACHE: Optional[pd.DataFrame] = None


def _get_label(level: str, target: str, insurer: str = None, category: str = None) -> Optional[str]:
    """Returns the pre-trained label string for industry-level requests, else None."""
    if level == "industry":
        return "industry_premium" if target == "premium_month_cr" else "industry_policies"
    return None  # non-industry levels have no pre-trained pkl


def _load_model_pkl(label: str, model_key: str):
    """Load a pre-trained model from .pkl via ModelManager."""
    return model_manager.load_model(label, model_key)


def _load_eval_report() -> Optional[pd.DataFrame]:
    """Load cached evaluation report CSV."""
    global _EVAL_CACHE
    if _EVAL_CACHE is not None:
        return _EVAL_CACHE
    if os.path.exists(EVAL_REPORT_PATH):
        try:
            _EVAL_CACHE = pd.read_csv(EVAL_REPORT_PATH)
            logger.info(f"Loaded evaluation report: {EVAL_REPORT_PATH}")
            return _EVAL_CACHE
        except Exception as e:
            logger.warning(f"Failed to load eval report: {e}")
    return None


def _metrics_from_report(label: str, target: str):
    """
    Return (metrics_list, recommended_model_name, rec_reason) from the
    cached evaluation_report.csv so we skip live model evaluation.
    Returns None if report not available.
    """
    from ..schemas import ModelEvaluationMetric
    report = _load_eval_report()
    if report is None:
        return None

    subset = report[(report["label"] == label) & (report["target"] == target)]
    if subset.empty:
        return None

    def _safe(val):
        try:
            v = float(val)
            return None if pd.isna(v) else round(v, 4)
        except Exception:
            return None

    metrics_list = []
    rec_row = subset[subset["recommended"] == True]
    recommended_model_name = rec_row.iloc[0]["model"] if not rec_row.empty else subset.iloc[0]["model"]
    rec_reason = (
        rec_row.iloc[0]["notes"] if not rec_row.empty and pd.notna(rec_row.iloc[0]["notes"])
        else f"{recommended_model_name} had the best validation sMAPE on the chronological holdout."
    )

    for _, row in subset.iterrows():
        metrics_list.append(ModelEvaluationMetric(
            model_name=str(row["model"]),
            mae=_safe(row.get("val_mae")),
            rmse=_safe(row.get("val_rmse")),
            mape=_safe(row.get("val_mape")),
            smape=_safe(row.get("val_smape")),
            wape=_safe(row.get("val_wape")),
            test_mae=_safe(row.get("test_mae")),
            test_rmse=_safe(row.get("test_rmse")),
            test_mape=_safe(row.get("test_mape")),
            test_smape=_safe(row.get("test_smape")),
            test_wape=_safe(row.get("test_wape")),
            status=str(row.get("status", "Success")),
            is_recommended=bool(row.get("recommended", False)),
            notes=str(row.get("notes", "")) if pd.notna(row.get("notes")) else "",
        ))

    return metrics_list, recommended_model_name, str(rec_reason)


class ForecastingService:
    def generate_forecast(self, req: ForecastRequest) -> ForecastResponse:
        df = data_service.get_processed_df()
        
        # 1. Aggregate Time Series
        agg_df, warnings = aggregate_time_series(
            df=df,
            level=req.level,
            target=req.target,
            insurer=req.insurer,
            category=req.category
        )

        n_obs = len(agg_df)
        if n_obs < 4:
            raise ValueError(f"Insufficient historical data ({n_obs} months). At least 4 months are required to forecast.")

        if n_obs < 24:
            warnings.append(f"History contains only {n_obs} months. Models requiring 24+ months will use adaptive parameters.")

        series = agg_df["target_value"]
        dates = agg_df["date"]
        last_date = str(dates.iloc[-1])

        # 2. Get evaluation metrics — use cached report (fast) or live evaluation (slow fallback)
        label = _get_label(req.level, req.target, req.insurer, req.category)
        cached = _metrics_from_report(label, req.target) if label else None

        if cached:
            metrics_list, recommended_model_name, rec_reason = cached
            from .evaluation_service import get_chronological_splits
            _, _, _, split_info = get_chronological_splits(len(series), dates)
            logger.info(f"Using cached evaluation metrics for label={label}")
        else:
            logger.info("No cached metrics found — running live evaluation")
            metrics_list, recommended_model_name, rec_reason, split_info = evaluate_models_on_series(series, dates)

        # 3. Determine which model to run for future forecasting
        model_key_to_use = "seasonal_naive"
        if req.selected_model and req.selected_model.lower() != "auto":
            clean_sel = req.selected_model.lower().strip()
            model_key_to_use = NAME_TO_KEY.get(clean_sel, clean_sel)
            if model_key_to_use not in MODEL_REGISTRY:
                warnings.append(f"Model '{req.selected_model}' not recognized; using recommended model '{recommended_model_name}'.")
                model_key_to_use = NAME_TO_KEY.get(recommended_model_name.lower(), "seasonal_naive")
        else:
            model_key_to_use = NAME_TO_KEY.get(recommended_model_name.lower(), "seasonal_naive")

        model_cls = MODEL_REGISTRY.get(model_key_to_use, MODEL_REGISTRY["seasonal_naive"])

        # 4. Load pre-trained pkl if available (fast), else fit live
        model_instance = None
        if label:
            model_instance = _load_model_pkl(label, model_key_to_use)

        if model_instance is None:
            logger.info(f"No pre-trained pkl found for {label}/{model_key_to_use} — fitting live")
            model_instance = model_cls()
            try:
                model_instance.fit(series, dates)
            except Exception as e:
                logger.warning(f"Live fit failed: {e}. Falling back to Seasonal Naive.")
                warnings.append(f"Model fell back to Seasonal Naive: {str(e)}")
                model_instance = MODEL_REGISTRY["seasonal_naive"]()
                model_key_to_use = "seasonal_naive"
                model_instance.fit(series, dates)

        # 4b. Predict
        try:
            point_forecasts, lower_bounds, upper_bounds = model_instance.predict(req.horizon)
        except Exception as e:
            logger.warning(f"Predict failed ({e}), falling back to Seasonal Naive")
            warnings.append(f"Prediction error, fell back to Seasonal Naive: {str(e)}")
            model_instance = MODEL_REGISTRY["seasonal_naive"]()
            model_instance.fit(series, dates)
            point_forecasts, lower_bounds, upper_bounds = model_instance.predict(req.horizon)

        # 5. Generate continuous future dates
        future_dates = generate_future_dates(last_date, req.horizon)

        # 6. Format Forecast Data Points
        forecast_points: List[ForecastDataPoint] = []
        for i in range(req.horizon):
            f_val = float(point_forecasts[i])
            l_val = float(lower_bounds[i]) if lower_bounds is not None else None
            u_val = float(upper_bounds[i]) if upper_bounds is not None else None
            
            if req.target == "policies_month":
                f_val = round(f_val)
                l_val = round(l_val) if l_val is not None else None
                u_val = round(u_val) if u_val is not None else None
            else:
                f_val = round(f_val, 2)
                l_val = round(l_val, 2) if l_val is not None else None
                u_val = round(u_val, 2) if u_val is not None else None

            forecast_points.append(ForecastDataPoint(
                date=future_dates[i],
                display_date=format_display_month(future_dates[i]),
                point_forecast=f_val,
                lower_bound=l_val,
                upper_bound=u_val,
                is_forecast=True
            ))

        # Format historical data points
        historical_points = df_to_historical_points(agg_df, req.target)
        target_unit = SUPPORTED_TARGETS.get(req.target, {}).get("unit", "")

        # Get test metrics for selected model
        test_metrics_dict = None
        if metrics_list:
            for m in metrics_list:
                if m.model_name.lower() == model_instance.name.lower() or NAME_TO_KEY.get(m.model_name.lower()) == model_key_to_use:
                    test_metrics_dict = {
                        "mae": m.test_mae,
                        "rmse": m.test_rmse,
                        "mape": m.test_mape,
                        "smape": m.test_smape,
                        "wape": m.test_wape
                    }
                    break

        # 4c. Build per-month test error analysis for the selected model
        test_error_analysis = build_monthly_error_analysis(
            series=series,
            dates=dates,
            model_key=model_key_to_use,
            model_cls=model_cls,
        )

        return ForecastResponse(
            level=req.level,
            insurer=req.insurer,
            category=req.category,
            target=req.target,
            target_unit=target_unit,
            horizon=req.horizon,
            selected_model=model_instance.name,
            recommended_model=recommended_model_name,
            model_selection_reason=rec_reason,
            historical_data=historical_points,
            forecast_data=forecast_points,
            evaluation_metrics=metrics_list,
            split_info=split_info,
            selected_model_test_metrics=test_metrics_dict,
            test_error_analysis=test_error_analysis,
            warnings=warnings
        )

    def compare_models(self, req: ModelComparisonRequest) -> ModelComparisonResponse:
        df = data_service.get_processed_df()
        agg_df, _ = aggregate_time_series(
            df=df,
            level=req.level,
            target=req.target,
            insurer=req.insurer,
            category=req.category
        )

        series = agg_df["target_value"]
        dates = agg_df["date"]

        label = _get_label(req.level, req.target, req.insurer, req.category)
        cached = _metrics_from_report(label, req.target) if label else None

        if cached:
            metrics_list, rec_model_name, rec_reason = cached
            from .evaluation_service import get_chronological_splits
            _, _, _, split_info = get_chronological_splits(len(series), dates)
        else:
            metrics_list, rec_model_name, rec_reason, split_info = evaluate_models_on_series(series, dates)

        target_unit = SUPPORTED_TARGETS.get(req.target, {}).get("unit", "")

        return ModelComparisonResponse(
            level=req.level,
            insurer=req.insurer,
            category=req.category,
            target=req.target,
            target_unit=target_unit,
            test_months=split_info.test_months,
            train_months=split_info.train_months,
            validation_months=split_info.validation_months,
            split_info=split_info,
            recommended_model=rec_model_name,
            recommendation_reason=rec_reason,
            metrics=metrics_list
        )

forecasting_service = ForecastingService()
