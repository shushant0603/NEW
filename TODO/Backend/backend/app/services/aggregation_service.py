import pandas as pd
import numpy as np
from typing import Optional, Tuple, List, Dict
from ..utils.logger import get_logger
from ..utils.date_utils import format_display_month
from ..schemas import HistoricalDataPoint

logger = get_logger("aggregation_service")

def aggregate_time_series(
    df: pd.DataFrame,
    level: str,
    target: str = "premium_month_cr",
    insurer: Optional[str] = None,
    category: Optional[str] = None
) -> Tuple[pd.DataFrame, List[str]]:
    """
    Extracts and aggregates a clean monthly time series according to the requested level.
    Avoids double-counting aggregate/summary rows.
    Guarantees monthly granularity sorted chronologically.
    Returns (aggregated_df, warnings).
    """
    warnings: List[str] = []

    if "date" not in df.columns or df["date"].isna().all():
        raise ValueError("Dataset does not contain valid chronological date column.")

    if target not in df.columns:
        raise ValueError(f"Target column '{target}' not found in dataset.")

    # Base valid dates
    valid_df = df[df["date"].notna()].copy()

    # Separate detailed and aggregate rows
    is_agg_mask = valid_df.get("is_aggregate_row", pd.Series(False, index=valid_df.index))

    # --- LEVEL 1: INDUSTRY ---
    if level == "industry":
        # Check if an explicit Grand Total row exists
        grand_total_match = valid_df[valid_df["insurer"].str.lower().isin(["grand total", "total industry", "total"])]
        if not grand_total_match.empty:
            # Aggregate across categories for the Grand Total row
            agg_df = grand_total_match.groupby("date", as_index=False).agg({
                "premium_month_cr": "sum",
                "policies_month": "sum"
            })
            warnings.append("Industry level aggregated using reported 'Grand Total' summary records.")
        else:
            # Aggregate all detailed non-aggregate rows
            detailed_df = valid_df[~is_agg_mask]
            agg_df = detailed_df.groupby("date", as_index=False).agg({
                "premium_month_cr": "sum",
                "policies_month": "sum"
            })
            warnings.append("Industry level calculated by summing detailed individual insurer records (excluding subtotals).")

    # --- LEVEL 2: INSURER ---
    elif level == "insurer":
        if not insurer:
            raise ValueError("Parameter 'insurer' is required for insurer level forecasting.")
        
        insurer_df = valid_df[valid_df["insurer"].str.lower() == insurer.lower()]
        if insurer_df.empty:
            raise ValueError(f"No records found for insurer '{insurer}'.")
        
        # Sum across categories for this insurer
        agg_df = insurer_df.groupby("date", as_index=False).agg({
            "premium_month_cr": "sum",
            "policies_month": "sum"
        })

    # --- LEVEL 3: CATEGORY ---
    elif level == "category":
        if not category:
            raise ValueError("Parameter 'category' is required for category level forecasting.")
        
        # Filter for category among detailed insurers to prevent double counting Grand Total rows
        cat_df = valid_df[(valid_df["category"].str.lower() == category.lower()) & (~is_agg_mask)]
        if cat_df.empty:
            # If no detailed rows, check all
            cat_df = valid_df[valid_df["category"].str.lower() == category.lower()]
        
        if cat_df.empty:
            raise ValueError(f"No records found for category '{category}'.")
        
        agg_df = cat_df.groupby("date", as_index=False).agg({
            "premium_month_cr": "sum",
            "policies_month": "sum"
        })

    # --- LEVEL 4: INSURER + CATEGORY ---
    elif level == "insurer_category":
        if not insurer or not category:
            raise ValueError("Both 'insurer' and 'category' are required for insurer_category level forecasting.")
        
        subset_df = valid_df[
            (valid_df["insurer"].str.lower() == insurer.lower()) &
            (valid_df["category"].str.lower() == category.lower())
        ]
        if subset_df.empty:
            raise ValueError(f"No records found for insurer '{insurer}' and category '{category}'.")
        
        agg_df = subset_df.groupby("date", as_index=False).agg({
            "premium_month_cr": "sum",
            "policies_month": "sum"
        })

    else:
        raise ValueError(f"Unsupported level '{level}'. Supported: industry, insurer, category, insurer_category.")

    # Sort strictly chronologically
    agg_df = agg_df.sort_values("date").reset_index(drop=True)

    # Set primary target value
    agg_df["target_value"] = agg_df[target].astype(float)

    # Compute MoM growth
    agg_df["mom_growth_pct"] = agg_df["target_value"].pct_change() * 100.0

    # Compute YoY growth (12-month lag)
    agg_df["yoy_growth_pct"] = agg_df["target_value"].pct_change(12) * 100.0

    # Replace NaNs or Infs
    agg_df["mom_growth_pct"] = agg_df["mom_growth_pct"].replace([np.inf, -np.inf], np.nan).round(2)
    agg_df["yoy_growth_pct"] = agg_df["yoy_growth_pct"].replace([np.inf, -np.inf], np.nan).round(2)

    # Add display date
    agg_df["display_date"] = agg_df["date"].apply(format_display_month)

    # Round target values
    if target == "policies_month":
        agg_df["target_value"] = agg_df["target_value"].round(0)
    else:
        agg_df["target_value"] = agg_df["target_value"].round(2)

    return agg_df, warnings

def df_to_historical_points(agg_df: pd.DataFrame, target: str) -> List[HistoricalDataPoint]:
    """Convert aggregated dataframe into list of HistoricalDataPoint schemas."""
    points = []
    for _, row in agg_df.iterrows():
        points.append(HistoricalDataPoint(
            date=str(row["date"]),
            display_date=str(row["display_date"]),
            target_value=float(row["target_value"]),
            premium_month_cr=float(row["premium_month_cr"]) if "premium_month_cr" in row and pd.notna(row["premium_month_cr"]) else None,
            policies_month=int(row["policies_month"]) if "policies_month" in row and pd.notna(row["policies_month"]) else None,
            yoy_growth_pct=float(row["yoy_growth_pct"]) if pd.notna(row.get("yoy_growth_pct")) else None,
            mom_growth_pct=float(row["mom_growth_pct"]) if pd.notna(row.get("mom_growth_pct")) else None
        ))
    return points
