import re
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List

from ..utils.date_utils import parse_date_to_monthly_iso
from ..utils.logger import get_logger
from ..schemas import DataQualityReport

logger = get_logger("preprocessing_service")

AGGREGATE_KEYWORDS = ["total", "grand total", "industry", "sum", "all insurers", "private total"]

NUMERIC_COLUMNS = [
    "premium_month_cr", "premium_ytd_cr", "premium_month_py_cr", "premium_ytd_py_cr",
    "premium_ytd_var_pct", "policies_month", "policies_ytd", "policies_month_py",
    "policies_ytd_py", "policies_ytd_var_pct"
]

def clean_numeric_series(series: pd.Series) -> pd.Series:
    """Safely converts string/object numeric series with commas/currency symbols to float."""
    if pd.api.types.is_numeric_dtype(series):
        return pd.to_numeric(series, errors="coerce")
    
    # Clean commas, currency symbols, whitespace, parentheses for negative values
    cleaned = series.astype(str).str.strip()
    cleaned = cleaned.str.replace(",", "", regex=False)
    cleaned = cleaned.str.replace("₹", "", regex=False)
    cleaned = cleaned.str.replace("$", "", regex=False)
    
    # Handle accounting negatives like (123.45)
    paren_mask = cleaned.str.startswith("(") & cleaned.str.endswith(")")
    cleaned = cleaned.str.replace("(", "", regex=False).str.replace(")", "", regex=False)
    
    numeric_s = pd.to_numeric(cleaned, errors="coerce")
    numeric_s[paren_mask] = -numeric_s[paren_mask]
    return numeric_s

def is_aggregate_insurer_name(name: str) -> bool:
    if not isinstance(name, str):
        return False
    lower = name.strip().lower()
    return any(kw in lower for kw in AGGREGATE_KEYWORDS)

def preprocess_life_insurance_data(df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, DataQualityReport]:
    """
    Robust data preprocessing pipeline:
    1. Inspects shape, column names, missing values.
    2. Parses dates into standardized 'YYYY-MM-01'.
    3. Safely parses numeric columns (premium, policies).
    4. Identifies duplicate rows and aggregate summary rows.
    5. Sorts chronologically.
    6. Produces an audit-grade DataQualityReport.
    """
    df = df_raw.copy()
    warnings: List[str] = []

    # Standardize column headers: lowercase and strip spaces
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    
    total_raw_rows = len(df)
    total_raw_cols = len(df.columns)

    # 1. Date Standardization
    if "date" in df.columns:
        # Already has date column
        try:
            df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-01")
        except Exception as e:
            warnings.append(f"Failed standardizing existing date column: {e}")
    elif "report_month" in df.columns and "report_year" in df.columns:
        parsed_dates = []
        for _, row in df.iterrows():
            iso_d = parse_date_to_monthly_iso(row.get("report_month"), row.get("report_year"))
            parsed_dates.append(iso_d)
        df["date"] = parsed_dates
    else:
        # Fallback date detection from any column containing 'month' or 'year' or 'period'
        date_candidates = [c for c in df.columns if any(k in c for k in ["date", "period", "month", "time"])]
        if date_candidates:
            try:
                df["date"] = pd.to_datetime(df[date_candidates[0]], errors="coerce").dt.strftime("%Y-%m-01")
                warnings.append(f"Inferred date from column '{date_candidates[0]}'")
            except Exception as e:
                df["date"] = None
                warnings.append(f"Could not infer date: {e}")
        else:
            df["date"] = None
            warnings.append("No date or report_month/report_year columns identified.")

    # Missing dates check
    invalid_dates_count = int(df["date"].isna().sum())
    if invalid_dates_count > 0:
        warnings.append(f"Detected {invalid_dates_count} records with unparseable or missing date values.")

    # 2. String/Categorical Cleanup
    for col in ["insurer", "category"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
        else:
            df[col] = "Unknown"
            warnings.append(f"Missing expected categorical column '{col}', populated with 'Unknown'")

    # Normalize category name variations (e.g. Renwable -> Renewable)
    if "category" in df.columns:
        df["category"] = df["category"].str.replace("Renwable", "Renewable", regex=False)

    # Note August 2016 recovery if present
    if "data_source" in df.columns:
        rec_count = int((df["data_source"] == "recovered_prior_year_comparison").sum())
        if rec_count > 0:
            warnings.append(f"Dataset includes {rec_count} observations recovered from verified prior-year comparison columns (including August 2016).")

    # 3. Numeric Column Cleanup
    missing_by_col = {}
    negative_by_col = {}

    for num_col in NUMERIC_COLUMNS:
        if num_col in df.columns:
            cleaned = clean_numeric_series(df[num_col])
            missing_count = int(cleaned.isna().sum())
            missing_by_col[num_col] = missing_count
            
            # Check for negative values
            neg_count = int((cleaned < 0).sum())
            if neg_count > 0:
                negative_by_col[num_col] = neg_count
                warnings.append(f"Column '{num_col}' contains {neg_count} negative values.")
            
            df[num_col] = cleaned
        else:
            # Column not present in raw CSV
            missing_by_col[num_col] = total_raw_rows

    # Ensure critical target columns exist
    if "premium_month_cr" not in df.columns:
        # Try to find alternate premium column
        alt_prem = [c for c in df.columns if "premium" in c and "month" in c]
        if alt_prem:
            df["premium_month_cr"] = clean_numeric_series(df[alt_prem[0]])
            warnings.append(f"Mapped target 'premium_month_cr' from '{alt_prem[0]}'")
        else:
            df["premium_month_cr"] = 0.0
            warnings.append("Target 'premium_month_cr' missing; filled with 0.0")

    if "policies_month" not in df.columns:
        alt_pol = [c for c in df.columns if "polic" in c and "month" in c]
        if alt_pol:
            df["policies_month"] = clean_numeric_series(df[alt_pol[0]]).fillna(0).astype(int)
            warnings.append(f"Mapped target 'policies_month' from '{alt_pol[0]}'")
        else:
            df["policies_month"] = 0
            warnings.append("Target 'policies_month' missing; filled with 0")

    # 4. Aggregate Rows Identification
    df["is_aggregate_row"] = df["insurer"].apply(is_aggregate_insurer_name)
    aggregate_rows_detected = int(df["is_aggregate_row"].sum())
    if aggregate_rows_detected > 0:
        warnings.append(
            f"Detected {aggregate_rows_detected} aggregate/summary rows (e.g. 'Grand Total', 'Total Private'). "
            "These are flagged to avoid double-counting in multi-level aggregations."
        )

    # 5. Duplicate Detection
    dedup_subset = ["date", "insurer", "category"]
    valid_dedup_subset = [c for c in dedup_subset if c in df.columns]
    duplicate_rows_detected = int(df.duplicated(subset=valid_dedup_subset, keep=False).sum())
    
    if duplicate_rows_detected > 0:
        warnings.append(
            f"Detected {duplicate_rows_detected} duplicate records based on {valid_dedup_subset}. "
            "Aggregating duplicates by summation."
        )
        # Group by dimension and aggregate numeric columns
        num_cols_to_sum = [c for c in NUMERIC_COLUMNS if c in df.columns]
        agg_dict = {c: "sum" for c in num_cols_to_sum}
        if "is_aggregate_row" in df.columns:
            agg_dict["is_aggregate_row"] = "first"
        
        non_group_cols = [c for c in df.columns if c not in valid_dedup_subset and c not in agg_dict]
        for c in non_group_cols:
            agg_dict[c] = "first"
            
        df = df.groupby(valid_dedup_subset, as_index=False).agg(agg_dict)

    # 6. Chronological Sorting
    if "date" in df.columns:
        df = df.sort_values(by=["date", "insurer", "category"]).reset_index(drop=True)

    min_date = df["date"].dropna().min() if "date" in df.columns and not df["date"].dropna().empty else None
    max_date = df["date"].dropna().max() if "date" in df.columns and not df["date"].dropna().empty else None

    quality_report = DataQualityReport(
        total_rows=total_raw_rows,
        total_columns=total_raw_cols,
        duplicate_rows_detected=duplicate_rows_detected,
        duplicate_handling_strategy="Summation of duplicates by (date, insurer, category)" if duplicate_rows_detected > 0 else "None needed",
        missing_values_by_column=missing_by_col,
        negative_values_found=negative_by_col,
        aggregate_rows_detected=aggregate_rows_detected,
        date_range={"min_date": min_date, "max_date": max_date},
        warnings=warnings
    )

    logger.info(f"Preprocessing completed. Processed rows: {len(df)}, Date range: {min_date} to {max_date}")
    return df, quality_report
