import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional

from .data_service import data_service
from ..schemas import (
    AnalyticsTrendsResponse,
    MonthlyTrendItem,
    InsurerPerformanceItem,
    CategoryDistributionItem,
    YearlyComparisonItem,
    InsightItem
)
from ..utils.date_utils import format_display_month
from ..utils.logger import get_logger

logger = get_logger("analytics_service")

class AnalyticsService:
    def get_trends_and_insights(self) -> AnalyticsTrendsResponse:
        df = data_service.get_processed_df()
        
        # Filter out aggregate rows to prevent double counting
        detailed_df = df[~df["is_aggregate_row"]].copy()

        # Monthly industry aggregation
        monthly = detailed_df.groupby("date", as_index=False).agg({
            "premium_month_cr": "sum",
            "policies_month": "sum"
        }).sort_values("date").reset_index(drop=True)

        monthly["premium_month_cr"] = monthly["premium_month_cr"].round(2)
        monthly["policies_month"] = monthly["policies_month"].astype(int)

        # YoY Growth rates
        monthly["yoy_prem_growth"] = monthly["premium_month_cr"].pct_change(12) * 100.0
        monthly["yoy_pol_growth"] = monthly["policies_month"].pct_change(12) * 100.0

        monthly_items: List[MonthlyTrendItem] = []
        for _, row in monthly.iterrows():
            monthly_items.append(MonthlyTrendItem(
                date=str(row["date"]),
                display_date=format_display_month(str(row["date"])),
                total_premium_cr=float(row["premium_month_cr"]),
                total_policies=int(row["policies_month"]),
                yoy_premium_growth_pct=round(float(row["yoy_prem_growth"]), 2) if pd.notna(row["yoy_prem_growth"]) else None,
                yoy_policy_growth_pct=round(float(row["yoy_pol_growth"]), 2) if pd.notna(row["yoy_pol_growth"]) else None
            ))

        latest_row = monthly.iloc[-1]
        latest_date = str(latest_row["date"])
        latest_display = format_display_month(latest_date)

        # Insurers performance in the latest month
        latest_df = detailed_df[detailed_df["date"] == latest_date]
        ins_agg = latest_df.groupby("insurer", as_index=False).agg({
            "premium_month_cr": "sum",
            "policies_month": "sum",
            "premium_ytd_cr": "max",
            "policies_ytd": "max"
        })

        total_latest_prem = float(ins_agg["premium_month_cr"].sum())
        ins_agg["market_share"] = (ins_agg["premium_month_cr"] / total_latest_prem * 100.0).round(2) if total_latest_prem > 0 else 0.0
        
        # Calculate YoY for insurers if 12m prior data exists
        prior_year_date = (pd.to_datetime(latest_date) - pd.DateOffset(years=1)).strftime("%Y-%m-01")
        py_df = detailed_df[detailed_df["date"] == prior_year_date].groupby("insurer", as_index=False)["premium_month_cr"].sum().rename(
            columns={"premium_month_cr": "py_prem"}
        )
        ins_agg = pd.merge(ins_agg, py_df, on="insurer", how="left")
        ins_agg["yoy_prem_growth"] = ((ins_agg["premium_month_cr"] - ins_agg["py_prem"]) / ins_agg["py_prem"] * 100.0).round(2)

        ins_agg = ins_agg.sort_values(by="premium_month_cr", ascending=False)

        top_insurers: List[InsurerPerformanceItem] = []
        for _, r in ins_agg.iterrows():
            top_insurers.append(InsurerPerformanceItem(
                insurer=str(r["insurer"]),
                latest_month_premium_cr=round(float(r["premium_month_cr"]), 2),
                latest_month_policies=int(r["policies_month"]),
                ytd_premium_cr=round(float(r["premium_ytd_cr"]), 2) if pd.notna(r["premium_ytd_cr"]) else 0.0,
                ytd_policies=int(r["policies_ytd"]) if pd.notna(r["policies_ytd"]) else 0,
                market_share_pct=float(r["market_share"]),
                yoy_premium_growth_pct=float(r["yoy_prem_growth"]) if pd.notna(r["yoy_prem_growth"]) else None
            ))

        # Category distribution
        cat_agg = detailed_df.groupby("category", as_index=False).agg({
            "premium_month_cr": "sum",
            "policies_month": "sum"
        })
        all_prem_sum = float(cat_agg["premium_month_cr"].sum())
        cat_agg["share_pct"] = (cat_agg["premium_month_cr"] / all_prem_sum * 100.0).round(2) if all_prem_sum > 0 else 0.0
        cat_agg = cat_agg.sort_values("premium_month_cr", ascending=False)

        category_dist: List[CategoryDistributionItem] = []
        for _, r in cat_agg.iterrows():
            category_dist.append(CategoryDistributionItem(
                category=str(r["category"]),
                total_premium_cr=round(float(r["premium_month_cr"]), 2),
                total_policies=int(r["policies_month"]),
                share_pct=float(r["share_pct"])
            ))

        # Seasonality profile (average premium by calendar month)
        monthly["cal_month"] = pd.to_datetime(monthly["date"]).dt.month
        monthly["month_name"] = pd.to_datetime(monthly["date"]).dt.strftime("%b")
        season_df = monthly.groupby(["cal_month", "month_name"], as_index=False).agg({
            "premium_month_cr": "mean",
            "policies_month": "mean"
        }).rename(columns={"premium_month_cr": "avg_premium_cr", "policies_month": "avg_policies"}).sort_values("cal_month")

        seasonality_profile = [
            {
                "month_num": int(r["cal_month"]),
                "month_name": str(r["month_name"]),
                "avg_premium_cr": round(float(r["avg_premium_cr"]), 2),
                "avg_policies": round(float(r["avg_policies"]))
            }
            for _, r in season_df.iterrows()
        ]

        # Yearly aggregation and comparison
        monthly["cal_year"] = pd.to_datetime(monthly["date"]).dt.year
        yearly_df = monthly.groupby("cal_year", as_index=False).agg({
            "premium_month_cr": "sum",
            "policies_month": "sum",
            "date": "count"
        }).rename(columns={"date": "months_count", "premium_month_cr": "year_prem", "policies_month": "year_pol"}).sort_values("cal_year")

        yearly_df["yoy_prem_growth"] = yearly_df["year_prem"].pct_change() * 100.0

        yearly_items: List[YearlyComparisonItem] = []
        for _, r in yearly_df.iterrows():
            m_count = int(r["months_count"])
            yearly_items.append(YearlyComparisonItem(
                year=int(r["cal_year"]),
                total_premium_cr=round(float(r["year_prem"]), 2),
                total_policies=int(r["year_pol"]),
                months_count=m_count,
                is_complete_year=(m_count == 12),
                yoy_growth_pct=round(float(r["yoy_prem_growth"]), 2) if pd.notna(r["yoy_prem_growth"]) else None
            ))

        # Generate Data-Driven Descriptive Insights
        insights = self._generate_descriptive_insights(monthly, ins_agg, cat_agg, season_df)

        return AnalyticsTrendsResponse(
            total_premium_cr=round(float(monthly["premium_month_cr"].sum()), 2),
            total_policies=int(monthly["policies_month"].sum()),
            latest_month=latest_date,
            latest_month_display=latest_display,
            yoy_premium_growth_pct=round(float(latest_row["yoy_prem_growth"]), 2) if pd.notna(latest_row["yoy_prem_growth"]) else None,
            yoy_policy_growth_pct=round(float(latest_row["yoy_pol_growth"]), 2) if pd.notna(latest_row["yoy_pol_growth"]) else None,
            monthly_trends=monthly_items,
            top_insurers=top_insurers,
            category_distribution=category_dist,
            seasonality_profile=seasonality_profile,
            yearly_comparison=yearly_items,
            insights=insights
        )

    def _generate_descriptive_insights(
        self,
        monthly: pd.DataFrame,
        ins_agg: pd.DataFrame,
        cat_agg: pd.DataFrame,
        season_df: pd.DataFrame
    ) -> List[InsightItem]:
        insights = []

        # 1. Seasonality Insight
        march_row = season_df[season_df["month_name"] == "Mar"]
        april_row = season_df[season_df["month_name"] == "Apr"]
        if not march_row.empty and not april_row.empty:
            mar_val = float(march_row["avg_premium_cr"].iloc[0])
            apr_val = float(april_row["avg_premium_cr"].iloc[0])
            ratio = round(mar_val / apr_val, 1) if apr_val > 0 else 1.0
            insights.append(InsightItem(
                id="seasonality_tax_surge",
                category="Seasonality",
                title="Fiscal Year-End Surge (March Peak)",
                description=(
                    f"The data shows that March records the highest historical monthly new business premium "
                    f"(averaging ₹{mar_val:,.2f} Cr), which is approximately {ratio}x the April intake (₹{apr_val:,.2f} Cr). "
                    "This pattern may reflect tax-saving insurance demand near the close of the financial year."
                ),
                metric_value=f"{ratio}x March/April Ratio",
                impact="positive"
            ))

        # 2. Market Leader & Concentration Insight
        if not ins_agg.empty:
            leader = ins_agg.iloc[0]
            leader_share = float(leader["market_share"])
            leader_name = str(leader["insurer"])
            top3_share = round(float(ins_agg.iloc[:3]["market_share"].sum()), 1)
            insights.append(InsightItem(
                id="market_concentration",
                category="Market Share",
                title="Market Share Concentration",
                description=(
                    f"The data shows that {leader_name} holds the largest market share ({leader_share}%) "
                    f"in the latest reported month. The top 3 insurers collectively account for {top3_share}% "
                    "of the total new business premium intake."
                ),
                metric_value=f"{top3_share}% Top 3 Share",
                impact="neutral"
            ))

        # 3. Fastest Growing Insurer Insight
        valid_growth_ins = ins_agg[ins_agg["yoy_prem_growth"].notna()].sort_values("yoy_prem_growth", ascending=False)
        if not valid_growth_ins.empty:
            fastest = valid_growth_ins.iloc[0]
            f_name = str(fastest["insurer"])
            f_rate = float(fastest["yoy_prem_growth"])
            insights.append(InsightItem(
                id="growth_leader",
                category="Growth",
                title="Highest Year-over-Year Growth",
                description=(
                    f"The selected period recorded {f_name} as the highest-growth insurer with a YoY premium "
                    f"increase of +{f_rate}%. Further investigation into product mix or agency expansion may explain this acceleration."
                ),
                metric_value=f"+{f_rate}% YoY",
                impact="positive"
            ))

        # 4. Dominant Category Insight
        if not cat_agg.empty:
            top_cat = cat_agg.iloc[0]
            c_name = str(top_cat["category"])
            c_share = float(top_cat["share_pct"])
            c_val = float(top_cat["premium_month_cr"]) if "premium_month_cr" in top_cat else float(top_cat.get("total_premium_cr", 0.0))
            insights.append(InsightItem(
                id="category_dominance",
                category="Product Mix",
                title="Dominant Product Category",
                description=(
                    f"The data shows '{c_name}' generates the largest share of cumulative premium at {c_share}% "
                    f"(₹{c_val:,.2f} Cr). This indicates a significant portfolio concentration in this product segment."
                ),
                metric_value=f"{c_share}% Total Share",
                impact="neutral"
            ))

        # 5. Temporal Anomaly / Contraction Insight
        if "yoy_prem_growth" in monthly.columns:
            min_growth_row = monthly.sort_values("yoy_prem_growth").iloc[0]
            min_rate = float(min_growth_row["yoy_prem_growth"])
            min_date_disp = format_display_month(str(min_growth_row["date"]))
            if min_rate < -20.0:
                insights.append(InsightItem(
                    id="historical_contraction",
                    category="Anomalies",
                    title="Historical Contraction Period Detected",
                    description=(
                        f"The selected period recorded a sharp contraction of {min_rate}% in {min_date_disp}. "
                        "This may indicate external macro-economic shocks or pandemic-related disruptions during that reporting month."
                    ),
                    metric_value=f"{min_rate}% in {min_date_disp}",
                    impact="warning"
                ))

        return insights

analytics_service = AnalyticsService()
