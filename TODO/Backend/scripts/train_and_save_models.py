# train_and_save_models.py
# Trains all 5 models and saves every one as a .pkl file to Backend/models/
# Usage: python scripts/train_and_save_models.py  (from Backend/ root)

import sys
import os
import pickle
import warnings

warnings.filterwarnings("ignore")

# --- Path setup ---
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(SCRIPT_DIR)
SRC_DIR      = os.path.join(BACKEND_ROOT, "backend")
MODELS_DIR   = os.path.join(BACKEND_ROOT, "models")

os.makedirs(MODELS_DIR, exist_ok=True)

if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

import numpy as np
import pandas as pd

from app.services.preprocessing_service import preprocess_life_insurance_data
from app.services.aggregation_service   import aggregate_time_series
from app.services.evaluation_service    import evaluate_models_on_series
from app.models import MODEL_REGISTRY

TARGETS = {
    "premium_month_cr": "industry_premium",
    "policies_month":   "industry_policies",
}

DATA_PATH = os.path.join(BACKEND_ROOT, "data", "processed",
                         "life_insurance_nbp_consolidated.csv")

LINE = "=" * 70
DIV  = "-" * 70


# --------------------------------------------------------------------------
def load_data():
    print(LINE)
    print("  INSURANCE INTELLIGENCE -- MODEL TRAINING PIPELINE")
    print(LINE)
    print(f"\n  Dataset : {DATA_PATH}\n")

    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    if not os.path.exists(DATA_PATH):
        raw_1 = os.path.join(BACKEND_ROOT, "data", "raw", "uploaded_consolidated_nb_data.csv")
        raw_2 = os.path.join(BACKEND_ROOT, "data", "raw", "life_insurance_new_business_data.csv")
        if os.path.exists(raw_1):
            import shutil
            shutil.copy(raw_1, DATA_PATH)
            print(f"  [INFO] Copied raw data from {raw_1} to {DATA_PATH}")
        elif os.path.exists(raw_2):
            import shutil
            shutil.copy(raw_2, DATA_PATH)
            print(f"  [INFO] Copied raw data from {raw_2} to {DATA_PATH}")
        else:
            raise FileNotFoundError(f"CSV not found at {DATA_PATH} or raw fallbacks.")

    try:
        raw_df = pd.read_csv(DATA_PATH, encoding="utf-8")
    except UnicodeDecodeError:
        raw_df = pd.read_csv(DATA_PATH, encoding="latin1")

    processed_df, qr = preprocess_life_insurance_data(raw_df)
    print(f"  [OK] {len(processed_df):,} rows loaded | "
          f"{qr.date_range['min_date']} to {qr.date_range['max_date']}")
    return processed_df


# --------------------------------------------------------------------------
def get_series(df, target):
    agg_df, _ = aggregate_time_series(df, level="industry", target=target)
    return agg_df["target_value"], agg_df["date"]


# --------------------------------------------------------------------------
def train_and_save(df, target, label):
    print(f"\n{DIV}")
    print(f"  TARGET  : {target}")
    print(f"  LABEL   : {label}")
    print(DIV)

    series, dates = get_series(df, target)
    print(f"  Series  : {len(series)} months\n")

    # --- Evaluate all models on 3-way chronological split ---
    print("  [EVAL] Running 3-way chronological split evaluation...")
    metrics_list, rec_model, rec_reason, split_info = evaluate_models_on_series(series, dates)

    print(f"\n  Split   : Train={split_info.train_months}m | "
          f"Val={split_info.validation_months}m | "
          f"Test={split_info.test_months}m")
    print(f"  Periods : {split_info.train_period} / "
          f"{split_info.validation_period} / "
          f"{split_info.test_period}")
    print(f"\n  [BEST]  {rec_model}")

    # --- Print metric table ---
    header = f"\n  {'Model':<35} {'Val sMAPE':>9} {'Val MAE':>10} {'Test sMAPE':>10} {'Test MAE':>10}  Status"
    print(header)
    print("  " + "-" * 80)
    for m in metrics_list:
        vs  = f"{m.smape:.2f}%"       if m.smape      is not None else "    --"
        vm  = f"{m.mae:.2f}"          if m.mae        is not None else "    --"
        ts  = f"{m.test_smape:.2f}%"  if m.test_smape is not None else "    --"
        tm  = f"{m.test_mae:.2f}"     if m.test_mae   is not None else "    --"
        tag = " <-- RECOMMENDED" if m.is_recommended else ""
        print(f"  {m.model_name:<35} {vs:>9} {vm:>10} {ts:>10} {tm:>10}  {m.status}{tag}")

    # --- Retrain each model on FULL series and save as .pkl ---
    print(f"\n  [SAVE] Retraining on full series -> saving .pkl to {MODELS_DIR}/\n")

    saved_files = []
    for key, cls in MODEL_REGISTRY.items():
        pkl_path = os.path.join(MODELS_DIR, f"{label}_{key}.pkl")
        try:
            model = cls()
            model.fit(series, dates)
            with open(pkl_path, "wb") as f:
                pickle.dump(model, f)
            saved_files.append(os.path.basename(pkl_path))
            print(f"  [OK]   {key:<22} -> {os.path.basename(pkl_path)}")
        except Exception as exc:
            print(f"  [FAIL] {key:<22}    ERROR: {exc}")

    # --- Save evaluation CSV ---
    rows = []
    for m in metrics_list:
        rows.append({
            "label": label, "target": target, "model": m.model_name,
            "val_mae": m.mae, "val_rmse": m.rmse,
            "val_mape": m.mape, "val_smape": m.smape, "val_wape": m.wape,
            "test_mae": m.test_mae, "test_rmse": m.test_rmse,
            "test_mape": m.test_mape, "test_smape": m.test_smape, "test_wape": m.test_wape,
            "status": m.status, "recommended": m.is_recommended, "notes": m.notes,
        })

    report_path = os.path.join(MODELS_DIR, "evaluation_report.csv")
    report_df = pd.DataFrame(rows)
    if os.path.exists(report_path):
        existing = pd.read_csv(report_path)
        existing = existing[~((existing["label"] == label) & (existing["target"] == target))]
        report_df = pd.concat([existing, report_df], ignore_index=True)
    report_df.to_csv(report_path, index=False)

    return rec_model, saved_files


# --------------------------------------------------------------------------
def main():
    df = load_data()

    all_results = {}
    for target, label in TARGETS.items():
        rec, files = train_and_save(df, target, label)
        all_results[target] = {"recommended": rec, "files": files}

    print(f"\n{LINE}")
    print("  TRAINING COMPLETE")
    print(LINE)
    print(f"\n  Artifacts  : {MODELS_DIR}")
    print(f"  Eval CSV   : {os.path.join(MODELS_DIR, 'evaluation_report.csv')}\n")
    for target, res in all_results.items():
        print(f"  {target:<30}  Best: {res['recommended']}")
        for fname in res["files"]:
            print(f"    -> {fname}")
    print(f"\n{LINE}\n")


if __name__ == "__main__":
    main()
