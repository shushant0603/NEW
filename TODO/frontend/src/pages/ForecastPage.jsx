import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  Table, 
  Download, 
  CheckCircle2, 
  Loader2, 
  HelpCircle,
  TrendingUp,
  Cpu,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Database,
  Award
} from 'lucide-react';
import ForecastControls from '../components/ForecastControls';
import ForecastChart from '../components/ForecastChart';
import ComparisonTable from '../components/ComparisonTable';
import api from '../services/api';

export default function ForecastPage({ metadata }) {
  // State for controls
  const [level, setLevel] = useState('industry');
  const [selectedInsurer, setSelectedInsurer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [target, setTarget] = useState('premium_month_cr');
  const [horizon, setHorizon] = useState(24);
  const [selectedModel, setSelectedModel] = useState('auto');

  // State for forecast results
  const [forecastResult, setForecastResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for comparison
  const [compareResult, setCompareResult] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const activeInsurer = selectedInsurer || (metadata?.insurers?.length > 0 ? metadata.insurers[0] : '');
  const activeCategory = selectedCategory || (metadata?.categories?.length > 0 ? metadata.categories[0] : '');

  const buildPayload = () => {
    const payload = {
      level,
      target,
      horizon: Number(horizon),
      selected_model: selectedModel,
    };
    if (level === 'insurer' || level === 'insurer_category') {
      payload.insurer = activeInsurer;
    }
    if (level === 'category' || level === 'insurer_category') {
      payload.category = activeCategory;
    }
    return payload;
  };

  const handleGenerateForecast = async () => {
    if ((level === 'insurer' || level === 'insurer_category') && !activeInsurer) {
      setError('Please select an insurer.');
      return;
    }
    if ((level === 'category' || level === 'insurer_category') && !activeCategory) {
      setError('Please select a category.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = buildPayload();
      const res = await api.generateForecast(payload);
      setForecastResult(res);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Failed to generate forecast');
    } finally {
      setLoading(false);
    }
  };

  // Set default insurer & category when metadata loads
  useEffect(() => {
    if (metadata) {
      if (metadata.insurers?.length > 0 && !selectedInsurer) {
        setSelectedInsurer(metadata.insurers[0]);
      }
      if (metadata.categories?.length > 0 && !selectedCategory) {
        setSelectedCategory(metadata.categories[0]);
      }
    }
  }, [metadata]);

  // Initial forecast generation on load
  useEffect(() => {
    if (metadata) {
      handleGenerateForecast();
    }
  }, [metadata]);

  const handleCompareModels = async () => {
    if ((level === 'insurer' || level === 'insurer_category') && !activeInsurer) return;
    if ((level === 'category' || level === 'insurer_category') && !activeCategory) return;

    setLoadingCompare(true);
    setShowComparison(true);
    try {
      const payload = buildPayload();
      const res = await api.compareModels(payload);
      setCompareResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCompare(false);
    }
  };

  const handleExportForecast = async () => {
    try {
      const payload = buildPayload();
      await api.exportForecast(payload);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = () => {
    setLevel('industry');
    if (metadata?.insurers?.length > 0) setSelectedInsurer(metadata.insurers[0]);
    if (metadata?.categories?.length > 0) setSelectedCategory(metadata.categories[0]);
    setTarget('premium_month_cr');
    setHorizon(24);
    setSelectedModel('auto');
    setShowComparison(false);
  };

  const targetUnit = target === 'premium_month_cr' ? '₹ Crore' : 'Number of Policies';

  // Find the selected model evaluation metrics
  const selectedMetric = forecastResult?.evaluation_metrics?.find(
    (m) => m.model_name === forecastResult.selected_model
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F2D64] bg-[#F0F6FF] px-2.5 py-1 rounded-full border border-[#BFDBFE]">
              Forecasting Studio
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#047857] bg-[#D1FAE5]/60 px-2.5 py-1 rounded-full border border-[#10B981]/30 flex items-center space-x-1">
              <Database className="w-3 h-3 text-[#10B981]" />
              <span>128 Authentic Observations (Jan 2016 – Aug 2026)</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F2D64] mt-2">
            Multi-Level Life Insurance Predictive Engine
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
            Generate 24-month out-of-sample forecasts (Sep 2026 – Aug 2028) across industry, insurer, and category tiers with 95% uncertainty intervals, backed by a strict 3-way chronological split.
          </p>
        </div>

        {forecastResult && (
          <div className="flex items-center space-x-3 bg-[#F8FAFC] border border-[#E5E7EB] p-3.5 rounded-xl text-xs">
            <Sparkles className="w-5 h-5 text-[#2563EB] shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Active Selected Model</div>
              <div className="font-bold text-[#0F2D64] text-sm">{forecastResult.selected_model}</div>
              <div className="text-[10px] text-[#047857] font-mono mt-0.5 font-bold">
                Val sMAPE: {selectedMetric?.smape !== undefined ? `${selectedMetric.smape}%` : '-'} | Test sMAPE: {forecastResult.selected_model_test_metrics?.smape !== undefined ? `${forecastResult.selected_model_test_metrics.smape}%` : '-'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3-Way Chronological Data Split & Validation Architecture Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4.5 h-4.5 text-[#10B981]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F2D64]">
              Chronological 3-Way Time Series Validation & Forecasting Architecture
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Total 128 Months Ingested • 0 Data Leakage • 100% Retraining for 24m Projection
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* 1. Train */}
          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
            <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold">
              <span>1. Training Fit</span>
              <span className="text-[#2563EB]">70.3%</span>
            </div>
            <div className="text-sm font-bold text-[#0F2D64] mt-1">90 Months</div>
            <div className="text-[11px] text-slate-500 font-medium">Jan 2016 – Jun 2023</div>
            <div className="text-[10px] text-slate-400 mt-1">Base parameter estimation</div>
          </div>

          {/* 2. Validation */}
          <div className="p-3 rounded-xl bg-[#D1FAE5]/40 border border-[#10B981]/30">
            <div className="flex items-center justify-between text-[10px] text-[#047857] uppercase font-bold">
              <span>2. Validation</span>
              <span className="text-[#047857] font-extrabold">Selection</span>
            </div>
            <div className="text-sm font-bold text-[#0F2D64] mt-1">19 Months</div>
            <div className="text-[11px] text-[#047857] font-semibold">Jul 2023 – Jan 2025</div>
            <div className="text-[10px] text-slate-500 mt-1">Drives model selection</div>
          </div>

          {/* 3. Untouched Test */}
          <div className="p-3 rounded-xl bg-[#F0F6FF] border border-[#BFDBFE]">
            <div className="flex items-center justify-between text-[10px] text-[#1E40AF] uppercase font-bold">
              <span>3. Test Holdout</span>
              <span className="text-[#2563EB] font-extrabold">Untouched</span>
            </div>
            <div className="text-sm font-bold text-[#0F2D64] mt-1">19 Months</div>
            <div className="text-[11px] text-[#1E40AF] font-semibold">Feb 2025 – Aug 2026</div>
            <div className="text-[10px] text-slate-500 mt-1">Unbiased holdout benchmark</div>
          </div>

          {/* 4. Retrain */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between text-[10px] text-amber-800 uppercase font-bold">
              <span>4. Full Retraining</span>
              <span className="text-amber-700">100% Data</span>
            </div>
            <div className="text-sm font-bold text-[#0F2D64] mt-1">128 Months</div>
            <div className="text-[11px] text-amber-800 font-semibold">Jan 2016 – Aug 2026</div>
            <div className="text-[10px] text-slate-500 mt-1">Winning model re-fit</div>
          </div>

          {/* 5. Production Forecast */}
          <div className="p-3 rounded-xl bg-[#D1FAE5]/60 border border-[#10B981]/40">
            <div className="flex items-center justify-between text-[10px] text-[#047857] uppercase font-bold">
              <span>5. Forecast Horizon</span>
              <span className="text-[#047857]">95% CI</span>
            </div>
            <div className="text-sm font-bold text-[#047857] mt-1">24 Months</div>
            <div className="text-[11px] text-[#047857] font-semibold">Sep 2026 – Aug 2028</div>
            <div className="text-[10px] text-slate-500 mt-1">Out-of-sample projection</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls + Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Controls */}
        <div className="lg:col-span-1">
          <ForecastControls
            level={level}
            setLevel={setLevel}
            selectedInsurer={selectedInsurer}
            setSelectedInsurer={setSelectedInsurer}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            target={target}
            setTarget={setTarget}
            horizon={horizon}
            setHorizon={setHorizon}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            metadata={metadata}
            onGenerateForecast={handleGenerateForecast}
            onCompareModels={handleCompareModels}
            onExportForecast={handleExportForecast}
            onReset={handleReset}
            loading={loading}
            loadingCompare={loadingCompare}
          />
        </div>

        {/* Right Column: Visualization and Output */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-3 font-medium">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">Error generating forecast:</span> {error}
              </div>
            </div>
          )}

          {forecastResult?.warnings?.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <div className="font-bold flex items-center space-x-1.5 text-amber-800">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>Data & Modeling Notes:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[11px] pl-1 font-medium">
                {forecastResult.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Forecast Chart */}
          <ForecastChart
            historicalData={forecastResult?.historical_data || []}
            forecastData={forecastResult?.forecast_data || []}
            targetUnit={targetUnit}
            title={`${level === 'industry' ? 'Industry' : level === 'insurer' ? selectedInsurer : level === 'category' ? selectedCategory : `${selectedInsurer} (${selectedCategory})`} - ${target === 'premium_month_cr' ? 'New Business Premium' : 'Policies Underwritten'}`}
            selectedModel={forecastResult?.selected_model || 'Model'}
          />

          {/* Dual Evaluation & Generalization Scorecards */}
          {forecastResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Validation Selection Performance */}
              <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#047857] bg-[#D1FAE5]/60 px-2.5 py-0.5 rounded-full border border-[#10B981]/30">
                    Validation Metric (Model Selection)
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">19 Months Holdout</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                    <span className="text-[10px] text-slate-500 font-bold block">sMAPE</span>
                    <span className="text-sm font-bold text-[#047857] font-mono">
                      {selectedMetric?.smape !== undefined && selectedMetric?.smape !== null ? `${selectedMetric.smape}%` : '-'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                    <span className="text-[10px] text-slate-500 font-bold block">RMSE</span>
                    <span className="text-xs font-bold text-[#0F2D64] font-mono">
                      {selectedMetric?.rmse !== undefined && selectedMetric?.rmse !== null ? selectedMetric.rmse.toLocaleString() : '-'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                    <span className="text-[10px] text-slate-500 font-bold block">MAE</span>
                    <span className="text-xs font-bold text-[#0F2D64] font-mono">
                      {selectedMetric?.mae !== undefined && selectedMetric?.mae !== null ? selectedMetric.mae.toLocaleString() : '-'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 font-medium pt-1">
                  Selection criterion: The algorithm strictly chooses the model minimizing validation sMAPE/RMSE.
                </p>
              </div>

              {/* Untouched Test Holdout Performance */}
              <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E40AF] bg-[#F0F6FF] px-2.5 py-0.5 rounded-full border border-[#BFDBFE]">
                    Test Metric (Untouched Holdout)
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">19 Months Holdout</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                    <span className="text-[10px] text-slate-500 font-bold block">Test sMAPE</span>
                    <span className="text-sm font-bold text-[#2563EB] font-mono">
                      {forecastResult.selected_model_test_metrics?.smape !== undefined && forecastResult.selected_model_test_metrics?.smape !== null ? `${forecastResult.selected_model_test_metrics.smape}%` : '-'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                    <span className="text-[10px] text-slate-500 font-bold block">Test RMSE</span>
                    <span className="text-xs font-bold text-[#0F2D64] font-mono">
                      {forecastResult.selected_model_test_metrics?.rmse !== undefined && forecastResult.selected_model_test_metrics?.rmse !== null ? forecastResult.selected_model_test_metrics.rmse.toLocaleString() : '-'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                    <span className="text-[10px] text-slate-500 font-bold block">Test MAE</span>
                    <span className="text-xs font-bold text-[#0F2D64] font-mono">
                      {forecastResult.selected_model_test_metrics?.mae !== undefined && forecastResult.selected_model_test_metrics?.mae !== null ? forecastResult.selected_model_test_metrics.mae.toLocaleString() : '-'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 font-medium pt-1">
                  Generalization check: Evaluated strictly after model selection to verify out-of-sample robustness without leakage.
                </p>
              </div>
            </div>
          )}

          {/* Model Rationale Card */}
          {forecastResult && (
            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm flex items-start space-x-3 text-xs">
              <div className="p-2 rounded-xl bg-[#D1FAE5]/60 text-[#047857] shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <span className="font-bold text-[#0F2D64]">Model Selection & Retraining Rationale:</span>
                <p className="text-slate-600 mt-0.5 font-medium">{forecastResult.model_selection_reason}</p>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center space-x-1.5 font-medium">
                  <Database className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  <span>
                    Final projection is produced by retraining <strong className="text-[#0F2D64]">{forecastResult.selected_model}</strong> on all 128 monthly observations (Jan 2016 – Aug 2026) to project through Aug 2028.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Model Comparison Drawer/Card */}
          {showComparison && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0F2D64] flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-[#2563EB]" />
                  <span>Validation Benchmark for Current Selection</span>
                </h3>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-xs text-slate-500 hover:text-[#0F2D64] font-semibold"
                >
                  Hide
                </button>
              </div>
              <ComparisonTable
                metrics={compareResult?.metrics || forecastResult?.evaluation_metrics || []}
                recommendedModel={compareResult?.recommended_model || forecastResult?.recommended_model}
                recommendationReason={compareResult?.recommendation_reason || forecastResult?.model_selection_reason}
                targetUnit={targetUnit}
              />
            </div>
          )}

          {/* Forecast Data Table */}
          {forecastResult?.forecast_data?.length > 0 && (
            <div className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-sm">
              <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F8FAFC]">
                <div className="flex items-center space-x-2">
                  <Table className="w-4 h-4 text-[#10B981]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F2D64]">
                    Forecast Values & Prediction Intervals
                  </h3>
                </div>
                <button
                  onClick={handleExportForecast}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-[#E5E7EB] text-[#0F2D64] text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-slate-600 border-b border-[#E5E7EB] uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="py-3 px-4 text-[#0F2D64]">Period</th>
                      <th className="py-3 px-3 text-[#2563EB]">Point Forecast</th>
                      <th className="py-3 px-3 text-slate-600">95% Lower Bound</th>
                      <th className="py-3 px-3 text-slate-600">95% Upper Bound</th>
                      <th className="py-3 px-3 text-slate-600">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {forecastResult.forecast_data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-bold text-[#0F2D64]">{row.display_date}</td>
                        <td className="py-2.5 px-3 font-bold text-[#2563EB] font-mono">
                          {row.point_forecast.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {row.lower_bound !== null ? row.lower_bound.toLocaleString() : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {row.upper_bound !== null ? row.upper_bound.toLocaleString() : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{targetUnit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

