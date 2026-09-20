from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# --- Health Schema ---
class HealthResponse(BaseModel):
    status: str
    version: str
    dataset_loaded: bool
    dataset_records: int
    data_source: str

# --- Data Quality and Summary Schemas ---
class ColumnQualityInfo(BaseModel):
    name: str
    dtype: str
    missing_count: int
    missing_percentage: float
    unique_count: int
    sample_values: List[Any]

class DataQualityReport(BaseModel):
    total_rows: int
    total_columns: int
    duplicate_rows_detected: int
    duplicate_handling_strategy: str
    missing_values_by_column: Dict[str, int]
    negative_values_found: Dict[str, int]
    aggregate_rows_detected: int
    date_range: Dict[str, Optional[str]]
    warnings: List[str]

class DataSummaryResponse(BaseModel):
    rows: int
    columns: int
    date_range: Dict[str, Optional[str]]
    num_insurers: int
    num_categories: int
    available_targets: List[str]
    quality_report: DataQualityReport

class TargetInfo(BaseModel):
    key: str
    display_name: str
    unit: str
    format: str

class DataMetadataResponse(BaseModel):
    insurers: List[str]
    categories: List[str]
    forecasting_levels: List[str]
    date_range: Dict[str, Optional[str]]
    available_targets: List[TargetInfo]
    available_horizons: List[int]
    aggregate_insurers: List[str]

# --- Historical Data Query ---
class HistoricalDataPoint(BaseModel):
    date: str
    display_date: str
    target_value: float
    premium_month_cr: Optional[float] = None
    policies_month: Optional[int] = None
    yoy_growth_pct: Optional[float] = None
    mom_growth_pct: Optional[float] = None

class HistoricalDataResponse(BaseModel):
    level: str
    insurer: Optional[str] = None
    category: Optional[str] = None
    target: str
    target_unit: str
    count: int
    data: List[HistoricalDataPoint]

# --- Forecasting Schemas ---
class ForecastRequest(BaseModel):
    level: str = Field(..., description="industry | insurer | category | insurer_category")
    insurer: Optional[str] = Field(None, description="Required for insurer and insurer_category levels")
    category: Optional[str] = Field(None, description="Required for category and insurer_category levels")
    target: str = Field("premium_month_cr", description="premium_month_cr | policies_month")
    horizon: int = Field(12, description="Forecast horizon in months: 3, 6, 12, 18, 24")
    selected_model: Optional[str] = Field("auto", description="Model: auto | seasonal_naive | linear_regression | sarima | prophet | lstm")

class ForecastDataPoint(BaseModel):
    date: str
    display_date: str
    point_forecast: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    is_forecast: bool = True

# --- Test Period Monthly Error Analysis Schemas ---
class MonthlyErrorPoint(BaseModel):
    date: str                          # ISO YYYY-MM-DD
    display_date: str                  # e.g. "Feb 2025"
    actual: float
    prediction: float
    error: float                       # actual - prediction (signed)
    absolute_error: float              # |actual - prediction|
    error_pct: Optional[float] = None # |error| / |actual| * 100 (None if actual≈0)

class TestPeriodErrorAnalysis(BaseModel):
    start: str                         # e.g. "2025-02"
    end: str                           # e.g. "2026-08"
    n_months: int
    mae: float
    rmse: float
    mape: Optional[float] = None       # None if any actual==0
    monthly_errors: List[MonthlyErrorPoint]

# --- Chronological Split Partition Schema ---
class SplitPartitionInfo(BaseModel):
    total_observations: int
    train_period: str
    train_months: int
    train_pct: float
    validation_period: str
    validation_months: int
    validation_pct: float
    test_period: str
    test_months: int
    test_pct: float
    forecast_period: str
    forecast_months: int

class ModelEvaluationMetric(BaseModel):
    model_name: str
    # Validation metrics (used for model selection)
    mae: Optional[float] = None
    rmse: Optional[float] = None
    mape: Optional[float] = None
    smape: Optional[float] = None
    wape: Optional[float] = None
    # Untouched Test metrics (evaluated post-selection for unbiased holdout benchmark)
    test_mae: Optional[float] = None
    test_rmse: Optional[float] = None
    test_mape: Optional[float] = None
    test_smape: Optional[float] = None
    test_wape: Optional[float] = None
    status: str
    error_message: Optional[str] = None
    is_recommended: bool = False
    notes: Optional[str] = None

class ForecastResponse(BaseModel):
    level: str
    insurer: Optional[str] = None
    category: Optional[str] = None
    target: str
    target_unit: str
    horizon: int
    selected_model: str
    recommended_model: str
    model_selection_reason: str
    historical_data: List[HistoricalDataPoint]
    forecast_data: List[ForecastDataPoint]
    evaluation_metrics: List[ModelEvaluationMetric]
    split_info: Optional[SplitPartitionInfo] = None
    selected_model_test_metrics: Optional[Dict[str, Any]] = None
    test_error_analysis: Optional[TestPeriodErrorAnalysis] = None
    warnings: List[str]

class ModelComparisonRequest(BaseModel):
    level: str
    insurer: Optional[str] = None
    category: Optional[str] = None
    target: str = "premium_month_cr"

class ModelComparisonResponse(BaseModel):
    level: str
    insurer: Optional[str] = None
    category: Optional[str] = None
    target: str
    target_unit: str
    test_months: int
    train_months: int
    validation_months: Optional[int] = None
    split_info: Optional[SplitPartitionInfo] = None
    recommended_model: str
    recommendation_reason: str
    metrics: List[ModelEvaluationMetric]

# --- Analytics Schemas ---
class MonthlyTrendItem(BaseModel):
    date: str
    display_date: str
    total_premium_cr: float
    total_policies: int
    yoy_premium_growth_pct: Optional[float] = None
    yoy_policy_growth_pct: Optional[float] = None

class InsurerPerformanceItem(BaseModel):
    insurer: str
    latest_month_premium_cr: float
    latest_month_policies: int
    ytd_premium_cr: float
    ytd_policies: int
    market_share_pct: float
    yoy_premium_growth_pct: Optional[float] = None

class CategoryDistributionItem(BaseModel):
    category: str
    total_premium_cr: float
    total_policies: int
    share_pct: float

class InsightItem(BaseModel):
    id: str
    category: str  # Growth, Seasonality, Market Share, Anomaly
    title: str
    description: str
    metric_value: Optional[str] = None
    impact: str  # positive, neutral, warning

class YearlyComparisonItem(BaseModel):
    year: int
    total_premium_cr: float
    total_policies: int
    months_count: int
    is_complete_year: bool
    yoy_growth_pct: Optional[float] = None

class AnalyticsTrendsResponse(BaseModel):
    total_premium_cr: float
    total_policies: int
    latest_month: str
    latest_month_display: str
    yoy_premium_growth_pct: Optional[float] = None
    yoy_policy_growth_pct: Optional[float] = None
    monthly_trends: List[MonthlyTrendItem]
    top_insurers: List[InsurerPerformanceItem]
    category_distribution: List[CategoryDistributionItem]
    seasonality_profile: List[Dict[str, Any]]
    yearly_comparison: Optional[List[YearlyComparisonItem]] = None
    insights: List[InsightItem]
