import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from ..models import MODEL_REGISTRY
from ..schemas import ModelEvaluationMetric, SplitPartitionInfo, MonthlyErrorPoint, TestPeriodErrorAnalysis
from ..config import (
    CONFIRMED_TOTAL_MONTHS,
    TRAIN_OBSERVATIONS,
    VAL_OBSERVATIONS,
    TEST_OBSERVATIONS,
    FORECAST_HORIZON
)
from ..utils.logger import get_logger

logger = get_logger("evaluation_service")

EPSILON = 1e-5

def compute_time_series_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Computes standard time-series forecast evaluation metrics."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    
    # Absolute errors
    abs_err = np.abs(y_true - y_pred)
    mae = float(np.mean(abs_err))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    
    # Safe MAPE
    denominator_mape = np.where(np.abs(y_true) < EPSILON, EPSILON, np.abs(y_true))
    mape = float(np.mean(abs_err / denominator_mape) * 100.0)
    
    # sMAPE
    denominator_smape = np.abs(y_true) + np.abs(y_pred) + EPSILON
    smape = float(np.mean((2.0 * abs_err) / denominator_smape) * 100.0)
    
    # WAPE
    sum_true = float(np.sum(np.abs(y_true)))
    wape = float((np.sum(abs_err) / (sum_true + EPSILON)) * 100.0)

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "mape": round(mape, 2),
        "smape": round(smape, 2),
        "wape": round(wape, 2)
    }

def get_chronological_splits(
    n_obs: int,
    dates: Optional[pd.Series] = None
) -> Tuple[int, int, int, SplitPartitionInfo]:
    """
    Computes strict chronological time-series splits:
    - If n_obs == 128 (confirmed full dataset):
      Train = 90 (Jan 2016 – Jun 2023, ~70.3%)
      Validation = 19 (Jul 2023 – Jan 2025, ~14.8%)
      Test = 19 (Feb 2025 – Aug 2026, ~14.8%)
      Forecast = 24 (Sep 2026 – Aug 2028)
    - Shorter series fallback: proportional ~70% train, ~15% val, ~15% test.
    """
    if n_obs == CONFIRMED_TOTAL_MONTHS:
        train_size = TRAIN_OBSERVATIONS
        val_size = VAL_OBSERVATIONS
        test_size = TEST_OBSERVATIONS
        train_period = "Jan 2016 – Jun 2023"
        val_period = "Jul 2023 – Jan 2025"
        test_period = "Feb 2025 – Aug 2026"
        forecast_period = "Sep 2026 – Aug 2028"
    else:
        train_size = max(4, int(round(n_obs * 0.70)))
        rem = n_obs - train_size
        val_size = max(1, rem // 2)
        test_size = max(1, rem - val_size)
        
        # In case n_obs is very small
        if train_size + val_size + test_size > n_obs:
            test_size = max(1, n_obs - train_size - val_size)

        if dates is not None and len(dates) == n_obs:
            train_period = f"{dates.iloc[0]} – {dates.iloc[train_size - 1]}"
            val_period = f"{dates.iloc[train_size]} – {dates.iloc[train_size + val_size - 1]}"
            test_period = f"{dates.iloc[train_size + val_size]} – {dates.iloc[-1]}"
        else:
            train_period = f"T1 – T{train_size}"
            val_period = f"T{train_size + 1} – T{train_size + val_size}"
            test_period = f"T{train_size + val_size + 1} – T{n_obs}"
        forecast_period = f"Future {FORECAST_HORIZON} Months"

    split_info = SplitPartitionInfo(
        total_observations=n_obs,
        train_period=train_period,
        train_months=train_size,
        train_pct=round((train_size / n_obs) * 100.0, 1),
        validation_period=val_period,
        validation_months=val_size,
        validation_pct=round((val_size / n_obs) * 100.0, 1),
        test_period=test_period,
        test_months=test_size,
        test_pct=round((test_size / n_obs) * 100.0, 1),
        forecast_period=forecast_period,
        forecast_months=FORECAST_HORIZON
    )

    return train_size, val_size, test_size, split_info

def evaluate_models_on_series(
    series: pd.Series,
    dates: Optional[pd.Series] = None
) -> Tuple[List[ModelEvaluationMetric], str, str, SplitPartitionInfo]:
    """
    Evaluates all candidate forecasting models using a strict 3-way chronological split:
    1. Fits models strictly on Train data (Jan 2016 – Jun 2023, 90 obs).
    2. Evaluates on Validation data (Jul 2023 – Jan 2025, 19 obs) to select best model.
       Test data remains strictly untouched during model selection.
    3. Evaluates models on untouched Test data (Feb 2025 – Aug 2026, 19 obs) for unbiased reporting.
    """
    clean_s = pd.to_numeric(series.dropna(), errors="coerce")
    n = len(clean_s)
    if n < 6:
        raise ValueError(f"Series has only {n} observations; at least 6 are required for evaluation.")

    train_size, val_size, test_size, split_info = get_chronological_splits(n, dates)

    # 1. Partition series chronologically without shuffling
    train_s = clean_s.iloc[:train_size]
    val_s = clean_s.iloc[train_size:train_size + val_size]
    test_s = clean_s.iloc[train_size + val_size:]

    y_val = val_s.to_numpy(dtype=float)
    y_test = test_s.to_numpy(dtype=float)

    train_dates = dates.iloc[:train_size] if dates is not None and len(dates) == n else None
    val_dates = dates.iloc[train_size:train_size + val_size] if dates is not None and len(dates) == n else None
    test_dates = dates.iloc[train_size + val_size:] if dates is not None and len(dates) == n else None

    # Train + Val combined series (used only for post-selection test evaluation)
    train_val_s = clean_s.iloc[:train_size + val_size]
    train_val_dates = dates.iloc[:train_size + val_size] if dates is not None and len(dates) == n else None

    results: List[ModelEvaluationMetric] = []

    for model_key, model_cls in MODEL_REGISTRY.items():
        try:
            # Step A: Fit strictly on Train series (Zero leakage of validation or test data)
            model = model_cls()
            model.fit(train_s, train_dates)
            y_pred_val, _, _ = model.predict(val_size)
            val_metrics = compute_time_series_metrics(y_val, y_pred_val)

            # Step B: Evaluate on Untouched Test Set
            # Model trained up to validation boundary (train + val), predicting forward onto test set
            test_metrics = None
            try:
                model_test = model_cls()
                model_test.fit(train_val_s, train_val_dates)
                y_pred_test, _, _ = model_test.predict(test_size)
                test_metrics = compute_time_series_metrics(y_test, y_pred_test)
            except Exception as te:
                logger.warning(f"Test evaluation for '{model_key}' encountered error: {te}")
                # Fallback: predict from train model over combined horizon
                y_pred_combined, _, _ = model.predict(val_size + test_size)
                test_metrics = compute_time_series_metrics(y_test, y_pred_combined[val_size:])

            status_text = "Success"
            if model_key == "prophet" and getattr(model, "use_fallback", False):
                status_text = "Fallback (Holt-Winters)"

            results.append(ModelEvaluationMetric(
                model_name=model.name,
                # Validation metrics (selection criterion)
                mae=val_metrics["mae"],
                rmse=val_metrics["rmse"],
                mape=val_metrics["mape"],
                smape=val_metrics["smape"],
                wape=val_metrics["wape"],
                # Untouched Test metrics (holdout generalization benchmark)
                test_mae=test_metrics["mae"] if test_metrics else None,
                test_rmse=test_metrics["rmse"] if test_metrics else None,
                test_mape=test_metrics["mape"] if test_metrics else None,
                test_smape=test_metrics["smape"] if test_metrics else None,
                test_wape=test_metrics["wape"] if test_metrics else None,
                status=status_text,
                error_message=None,
                notes=model.notes
            ))
        except Exception as e:
            logger.warning(f"Model '{model_key}' failed during evaluation: {e}")
            results.append(ModelEvaluationMetric(
                model_name=model_cls().name if hasattr(model_cls, "name") else model_key,
                status="Failed",
                error_message=str(e),
                notes=f"Evaluation failed: {str(e)}"
            ))

    # Step C: Model Selection strictly on Validation metrics
    # Test set is NEVER used to select the model
    successful = [m for m in results if m.status in ["Success", "Fallback (Holt-Winters)"] and m.smape is not None]

    if successful:
        best_metric = min(successful, key=lambda x: (x.smape, x.rmse))
        for r in results:
            if r.model_name == best_metric.model_name:
                r.is_recommended = True

        rec_model_name = best_metric.model_name
        rec_reason = (
            f"Selected '{rec_model_name}' based on superior validation accuracy (lowest sMAPE: "
            f"{best_metric.smape}% | RMSE: {best_metric.rmse}) over the {val_size}-month validation period "
            f"({split_info.validation_period}). Test holdout ({split_info.test_period}) remained untouched during selection "
            f"(Test sMAPE: {best_metric.test_smape}%)."
        )
    else:
        rec_model_name = "Seasonal Naive"
        rec_reason = "Fallback to Seasonal Naive model as other models failed to converge."

    return results, rec_model_name, rec_reason, split_info


_MONTHLY_ERROR_CACHE: Dict[str, TestPeriodErrorAnalysis] = {}

def build_monthly_error_analysis(
    series: pd.Series,
    dates: Optional[pd.Series],
    model_key: str,
    model_cls,
) -> Optional[TestPeriodErrorAnalysis]:
    """
    Produces per-month error analysis for the strictly held-out test period.
    Uses in-memory caching to prevent expensive re-training on repeated requests.
    """
    from ..utils.date_utils import format_display_month
    try:
        clean_s = pd.to_numeric(series.dropna(), errors="coerce")
        n = len(clean_s)
        if n < 6:
            return None

        # Check memory cache
        first_val = float(clean_s.iloc[0])
        last_val = float(clean_s.iloc[-1])
        cache_key = f"{n}_{first_val:.2f}_{last_val:.2f}_{model_key}"
        if cache_key in _MONTHLY_ERROR_CACHE:
            return _MONTHLY_ERROR_CACHE[cache_key]

        train_size, val_size, test_size, _ = get_chronological_splits(n, dates)

        if test_size < 1:
            return None

        # ── Series partitions ───────────────────────────────────────────────
        train_val_s = clean_s.iloc[: train_size + val_size]
        test_s = clean_s.iloc[train_size + val_size :]
        y_test = test_s.to_numpy(dtype=float)

        test_dates: Optional[pd.Series] = None
        if dates is not None and len(dates) == n:
            train_val_dates = dates.iloc[: train_size + val_size]
            test_dates = dates.iloc[train_size + val_size :]
        else:
            train_val_dates = None

        # ── Fit on train+val, predict test_size steps ───────────────────────
        # For live test evaluation, instantiate with fast/adaptive settings if supported
        if model_key == "lstm":
            model = model_cls(epochs=8) if hasattr(model_cls, "__init__") else model_cls()
        else:
            model = model_cls()

        model.fit(train_val_s, train_val_dates)
        y_pred_raw, _, _ = model.predict(test_size)
        y_pred = np.asarray(y_pred_raw, dtype=float)

        # Guard: clip prediction array length to actual test length
        min_len = min(len(y_test), len(y_pred))
        y_test = y_test[:min_len]
        y_pred = y_pred[:min_len]

        # ── Per-month error rows ─────────────────────────────────────────────
        monthly_errors: List[MonthlyErrorPoint] = []
        for i in range(min_len):
            act = float(y_test[i])
            pred = float(y_pred[i])
            err = act - pred
            abs_err = abs(err)
            err_pct: Optional[float] = None
            if abs(act) >= EPSILON:
                err_pct = round(abs_err / abs(act) * 100.0, 4)

            # Date label
            if test_dates is not None and i < len(test_dates):
                iso_date = str(test_dates.iloc[i])[:10]   # ensure YYYY-MM-DD
            else:
                iso_date = f"T{train_size + val_size + i + 1}"

            monthly_errors.append(MonthlyErrorPoint(
                date=iso_date,
                display_date=format_display_month(iso_date) if "-" in iso_date else iso_date,
                actual=round(act, 4),
                prediction=round(pred, 4),
                error=round(err, 4),
                absolute_error=round(abs_err, 4),
                error_pct=round(err_pct, 4) if err_pct is not None else None,
            ))

        # ── Aggregate metrics (test-only, no leakage) ───────────────────────
        abs_errors = np.abs(y_test - y_pred)
        mae = float(round(np.mean(abs_errors), 4))
        rmse = float(round(np.sqrt(np.mean((y_test - y_pred) ** 2)), 4))

        # MAPE — safe division
        denom = np.where(np.abs(y_test) < EPSILON, np.nan, np.abs(y_test))
        ape = np.abs(y_test - y_pred) / denom
        mape: Optional[float] = None
        if not np.all(np.isnan(ape)):
            mape = float(round(float(np.nanmean(ape)) * 100.0, 4))

        # Period labels
        start_label = monthly_errors[0].date[:7] if monthly_errors else ""
        end_label = monthly_errors[-1].date[:7] if monthly_errors else ""

        result = TestPeriodErrorAnalysis(
            start=start_label,
            end=end_label,
            n_months=min_len,
            mae=mae,
            rmse=rmse,
            mape=mape,
            monthly_errors=monthly_errors,
        )
        _MONTHLY_ERROR_CACHE[cache_key] = result
        return result

    except Exception as e:
        logger.warning(f"build_monthly_error_analysis failed for '{model_key}': {e}")
        return None
