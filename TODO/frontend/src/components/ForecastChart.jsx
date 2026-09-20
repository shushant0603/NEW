import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  BarChart,
  Line,
  Area,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  ArrowLeftRight,
  Download,
  BarChart2,
  Table,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export default function ForecastChart({
  historicalData = [],
  forecastData = [],
  targetUnit = '₹ Crore',
  title = 'Historical Actuals & 24-Month Forecast',
  selectedModel = 'Model',
  testErrorAnalysis = null,   // { monthly_errors: [{date, actual, prediction, display_date}] }
  initialView = 'forecast',   // 'forecast' | 'error_analysis'
}) {
  const [viewMode, setViewMode] = useState(initialView);

  const lastHistorical = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;

  // Build a lookup from date → test prediction value
  const testPredMap = {};
  if (testErrorAnalysis?.monthly_errors) {
    testErrorAnalysis.monthly_errors.forEach((r) => {
      testPredMap[r.date] = r.prediction;
    });
  }
  const hasTestPred = Object.keys(testPredMap).length > 0;

  // Determine the first test date for ReferenceLine
  const firstTestDate = testErrorAnalysis?.monthly_errors?.[0]?.display_date ?? null;
  const lastTestDate = testErrorAnalysis?.monthly_errors?.at(-1)?.display_date ?? null;

  const chartData = [
    ...historicalData.map((d) => ({
      date: d.date,
      display_date: d.display_date,
      historical: d.target_value,
      test_pred: testPredMap[d.date] ?? null,  // overlay test predictions
      forecast: null,
      lower_bound: null,
      upper_bound: null,
      is_forecast: false,
    })),
    ...(lastHistorical
      ? [
        {
          date: lastHistorical.date,
          display_date: lastHistorical.display_date,
          historical: null,
          test_pred: null,
          forecast: lastHistorical.target_value,
          lower_bound: lastHistorical.target_value,
          upper_bound: lastHistorical.target_value,
          is_forecast: true,
          is_anchor: true,
        },
      ]
      : []),
    ...forecastData.map((d) => ({
      date: d.date,
      display_date: d.display_date,
      historical: null,
      test_pred: null,
      forecast: d.point_forecast,
      lower_bound: d.lower_bound,
      upper_bound: d.upper_bound,
      interval_range: d.upper_bound !== null && d.lower_bound !== null ? [d.lower_bound, d.upper_bound] : null,
      is_forecast: true,
    })),
  ];

  const formatValue = (val) => {
    if (val === null || val === undefined) return '';
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const isCurrency = targetUnit.includes('Crore') || targetUnit.includes('₹');

  const fmtAxis = (val) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val;
  };

  // Custom tooltip for main forecast chart
  const CustomForecastTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload;
      return (
        <div className="bg-[#0F2D64] text-white p-3.5 rounded-xl shadow-2xl text-xs space-y-2 z-50 min-w-[210px] border border-blue-900/60">
          <p className="font-bold text-slate-200 border-b border-blue-900/60 pb-1.5">{dataPoint?.display_date || label}</p>

          {dataPoint?.historical !== null && dataPoint?.historical !== undefined && (
            <div className="flex items-center justify-between space-x-3">
              <span className="flex items-center text-[#10B981] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#10B981] mr-1.5"></span>
                Actual:
              </span>
              <span className="font-bold text-white font-mono">{formatValue(dataPoint.historical)} {targetUnit}</span>
            </div>
          )}

          {dataPoint?.test_pred !== null && dataPoint?.test_pred !== undefined && (
            <>
              <div className="flex items-center justify-between space-x-3">
                <span className="flex items-center text-[#F59E0B] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B] mr-1.5"></span>
                  Model Prediction:
                </span>
                <span className="font-bold text-white font-mono">{formatValue(dataPoint.test_pred)} {targetUnit}</span>
              </div>

              {dataPoint?.historical !== null && dataPoint?.historical !== undefined && (() => {
                const diff = Number(dataPoint.historical) - Number(dataPoint.test_pred);
                const absDiff = Math.abs(diff);
                const errPct = (absDiff / Math.max(Math.abs(Number(dataPoint.historical)), 0.001)) * 100;
                return (
                  <div className="pt-1.5 mt-1 border-t border-blue-900/60 space-y-1">
                    <div className="flex items-center justify-between space-x-3 text-[11px]">
                      <span className="text-slate-300">Signed Error:</span>
                      <span className={`font-mono font-bold ${diff >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {diff >= 0 ? '+' : ''}{formatValue(diff)} {targetUnit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between space-x-3 text-[11px]">
                      <span className="text-slate-300">Abs. Error (%):</span>
                      <span className={`font-mono font-bold ${errPct <= 5 ? 'text-emerald-300' : errPct <= 8 ? 'text-blue-300' : 'text-amber-300'}`}>
                        {formatValue(absDiff)} {targetUnit} ({errPct.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {dataPoint?.forecast !== null && dataPoint?.forecast !== undefined && !dataPoint?.is_anchor && (
            <>
              <div className="flex items-center justify-between space-x-3">
                <span className="flex items-center text-[#60A5FA] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB] mr-1.5"></span>
                  Forecast ({selectedModel}):
                </span>
                <span className="font-bold text-white font-mono">{formatValue(dataPoint.forecast)} {targetUnit}</span>
              </div>

              {dataPoint?.lower_bound !== null && dataPoint?.upper_bound !== null && (
                <div className="text-[11px] text-slate-300 pt-1.5 border-t border-blue-900/60 flex justify-between space-x-2">
                  <span>95% CI Range:</span>
                  <span className="font-mono text-emerald-300 font-semibold">
                    [{formatValue(dataPoint.lower_bound)} - {formatValue(dataPoint.upper_bound)}]
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      );
    }
    return null;
  };

  // Export CSV handler for test error analysis
  const handleExportErrorCsv = () => {
    if (!testErrorAnalysis?.monthly_errors) return;
    const errors = testErrorAnalysis.monthly_errors;
    const headers = ['Month', 'Date', 'Actual', 'Prediction', 'Signed_Error', 'Absolute_Error', 'Error_Percentage_Pct'];
    const rows = errors.map((r) => [
      `"${r.display_date}"`,
      `"${r.date}"`,
      r.actual ?? '',
      r.prediction ?? '',
      r.error ?? '',
      r.absolute_error ?? '',
      r.error_pct ?? '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `test_period_error_analysis_${selectedModel.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
      {/* ── Header with Title on Left and Swap/Toggle on Right ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-[#0F2D64] tracking-tight">{title}</h3>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${viewMode === 'forecast'
                  ? 'text-[#2563EB] bg-[#EFF6FF] border-[#BFDBFE]'
                  : 'text-[#047857] bg-[#D1FAE5]/60 border-[#10B981]/30'
                }`}
            >
              {viewMode === 'forecast' ? 'Full Forecast View' : 'Test Error Analysis View'}
            </span>
          </div>
          <p className="text-xs text-[#6B7280] font-medium mt-0.5">
            {viewMode === 'forecast'
              ? `Monthly trends with 24-month out-of-sample projection (${historicalData.length}m historical + ${forecastData.length}m forecast)`
              : `Monthly actual vs predicted backtest analysis on strictly unseen test data (${firstTestDate || 'Feb 2025'} – ${lastTestDate || 'Aug 2026'})`}
          </p>
        </div>

        {/* Right side: Swap View Controls & Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Switcher / Swap Toggle */}
          <div className="flex items-center p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('forecast')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'forecast'
                  ? 'bg-white text-[#0F2D64] shadow-xs'
                  : 'text-slate-500 hover:text-[#0F2D64]'
                }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Forecast Graph</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('error_analysis')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'error_analysis'
                  ? 'bg-[#0F2D64] text-white shadow-xs'
                  : 'text-slate-500 hover:text-[#0F2D64]'
                }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Error Analysis ({testErrorAnalysis?.n_months || 19}m)</span>
            </button>
          </div>

          {/* Swap Quick Button */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'forecast' ? 'error_analysis' : 'forecast')}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="Swap between Forecast Graph and Error Analysis"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="hidden sm:inline">Swap</span>
          </button>
        </div>
      </div>

      {/* ── View 1: Main Forecast Graph ── */}
      {viewMode === 'forecast' && (
        <div className="space-y-4">
          {/* Legend row */}
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs font-semibold pt-1">
            <span className="flex items-center text-[#10B981]">
              <span className="w-3.5 h-1 bg-[#10B981] rounded-full mr-1.5 inline-block"></span> Actual
            </span>
            {hasTestPred && (
              <span className="flex items-center text-[#F59E0B]">
                <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#F59E0B] mr-1.5 inline-block"></span>
                Model Prediction ({firstTestDate} – {lastTestDate})
              </span>
            )}
            <span className="flex items-center text-[#2563EB]">
              <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#2563EB] mr-1.5 inline-block"></span> Forecast
            </span>
            <span className="flex items-center text-[#60A5FA]">
              <span className="w-3.5 h-2 bg-[#2563EB]/20 rounded-xs mr-1.5 inline-block"></span> 95% CI
            </span>
          </div>

          <div className="h-[380px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="sureIntervalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

                <XAxis
                  dataKey="display_date"
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />

                <YAxis
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={fmtAxis}
                />

                <Tooltip content={<CustomForecastTooltip />} />

                {/* Test period start marker */}
                {firstTestDate && hasTestPred && (
                  <ReferenceLine
                    x={firstTestDate}
                    stroke="#F59E0B"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{
                      value: '◀ Test Period',
                      position: 'insideTopLeft',
                      fill: '#B45309',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}

                {/* Forecast horizon marker */}
                {lastHistorical && (
                  <ReferenceLine
                    x={lastHistorical.display_date}
                    stroke="#94A3B8"
                    strokeDasharray="3 3"
                    label={{
                      value: 'Forecast ➔',
                      position: 'insideTopRight',
                      fill: '#64748B',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                )}

                {/* Prediction Interval Shaded Band */}
                <Area
                  type="monotone"
                  dataKey="interval_range"
                  stroke="#2563EB"
                  strokeOpacity={0.25}
                  fill="url(#sureIntervalGradient)"
                  isAnimationActive={false}
                />

                {/* Historical Series (Emerald Solid) */}
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 2.5, fill: '#10B981' }}
                  activeDot={{ r: 5, fill: '#059669' }}
                  name="Actual"
                />

                {/* Test Period Predictions (Amber Dashed) */}
                {hasTestPred && (
                  <Line
                    type="monotone"
                    dataKey="test_pred"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    strokeDasharray="5 3"
                    dot={{ r: 3.5, fill: '#F59E0B', strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Test Prediction"
                    connectNulls={false}
                  />
                )}

                {/* Out of Sample Forecast (Royal Blue Dashed) */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#2563EB"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  dot={{ r: 3, fill: '#2563EB' }}
                  activeDot={{ r: 6, fill: '#1D4ED8' }}
                  name="Forecast"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Footer explanation note */}
          {hasTestPred && firstTestDate && lastTestDate && (
            <p className="text-[10px] text-slate-400 font-medium text-center">
              <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-amber-400 mr-1 align-middle" />
              <strong className="text-amber-600">Amber dashed</strong> = model's test-period predictions ({firstTestDate} – {lastTestDate}) vs actual (green) — gap between lines is the error. Click <strong>"Error Analysis"</strong> above to see detailed metrics.
            </p>
          )}
        </div>
      )}

      {/* ── View 2: Test Period Error Analysis (Swapped View) ── */}
      {viewMode === 'error_analysis' && testErrorAnalysis?.monthly_errors?.length > 0 && (() => {
        const ea = testErrorAnalysis;
        const errChartData = ea.monthly_errors.map((r) => ({
          month: r.display_date,
          actual: r.actual,
          prediction: r.prediction,
          absError: r.absolute_error,
          errPct: r.error_pct ?? 0,
        }));

        const validErrors = ea.monthly_errors.filter((r) => r.error_pct != null);
        const bestMonth =
          validErrors.length > 0
            ? validErrors.reduce((min, r) => (r.error_pct < min.error_pct ? r : min), validErrors[0])
            : null;
        const worstMonth =
          validErrors.length > 0
            ? validErrors.reduce((max, r) => (r.error_pct > max.error_pct ? r : max), validErrors[0])
            : null;
        const accuracyPct = ea.mape != null ? Math.max(0, 100 - ea.mape).toFixed(2) : '-';

        const ErrorLineTooltip = ({ active, payload, label }) => {
          if (!active || !payload?.length) return null;
          const actVal = payload.find((p) => p.dataKey === 'actual')?.value;
          const predVal = payload.find((p) => p.dataKey === 'prediction')?.value;
          const errPctVal = payload.find((p) => p.dataKey === 'errPct')?.payload?.errPct;
          return (
            <div className="bg-[#0F2D64] text-white rounded-xl shadow-2xl p-3.5 text-xs min-w-[180px] border border-blue-900/60">
              <p className="font-bold text-slate-200 mb-2 border-b border-blue-900/60 pb-1">{label}</p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 font-semibold text-[#10B981]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" />
                    Actual:
                  </span>
                  <span className="font-bold text-white font-mono ml-3">{formatValue(actVal)} {targetUnit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 font-semibold text-[#60A5FA]">
                    <span className="w-2 h-2 rounded-full bg-[#2563EB] inline-block" />
                    Prediction:
                  </span>
                  <span className="font-bold text-white font-mono ml-3">{formatValue(predVal)} {targetUnit}</span>
                </div>
                {errPctVal != null && (
                  <div className="flex justify-between items-center pt-1.5 border-t border-blue-900/60">
                    <span className="text-slate-300">Error Rate:</span>
                    <span
                      className={`font-bold font-mono ml-3 ${errPctVal <= 5 ? 'text-emerald-300' : errPctVal <= 8 ? 'text-blue-300' : 'text-amber-300'
                        }`}
                    >
                      {errPctVal.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        };

        const ErrorBarTooltip = ({ active, payload, label }) => {
          if (!active || !payload?.length) return null;
          return (
            <div className="bg-[#0F2D64] text-white border border-blue-900/60 rounded-xl shadow-2xl p-3 text-xs">
              <p className="font-bold text-slate-200 mb-1 border-b border-blue-900/60 pb-1">{label}</p>
              <p className="text-slate-300">
                Abs. Error:{' '}
                <span className="font-bold text-white font-mono">
                  {formatValue(payload[0]?.value)} {targetUnit}
                </span>
              </p>
              <p className="text-slate-300 mt-0.5">
                Error %:{' '}
                <span
                  className={`font-bold font-mono ${payload[0]?.payload?.errPct <= 5
                      ? 'text-emerald-300'
                      : payload[0]?.payload?.errPct <= 8
                        ? 'text-blue-300'
                        : 'text-amber-300'
                    }`}
                >
                  {payload[0]?.payload?.errPct?.toFixed(2)}%
                </span>
              </p>
            </div>
          );
        };

        return (
          <div className="space-y-4 pt-1">
            {/* 6 Key Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-[#E5E7EB] text-center shadow-2xs">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Test MAE</div>
                <div className="text-sm font-bold text-[#0F2D64] font-mono mt-0.5">{formatValue(ea.mae)}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">{isCurrency ? '₹ Cr avg' : 'policies avg'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-[#E5E7EB] text-center shadow-2xs">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Test RMSE</div>
                <div className="text-sm font-bold text-[#0F2D64] font-mono mt-0.5">{formatValue(ea.rmse)}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">Penalizes outliers</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-[#E5E7EB] text-center shadow-2xs">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Test MAPE</div>
                <div className="text-sm font-bold text-[#2563EB] font-mono mt-0.5">
                  {ea.mape != null ? `${ea.mape.toFixed(2)}%` : '-'}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">Mean abs. % error</div>
              </div>
              <div className="p-3 rounded-xl bg-[#D1FAE5]/40 border border-[#10B981]/30 text-center shadow-2xs">
                <div className="text-[9px] font-bold text-[#047857] uppercase tracking-wider">Accuracy</div>
                <div className="text-sm font-bold text-[#047857] font-mono mt-0.5">{accuracyPct}%</div>
                <div className="text-[9px] text-[#047857] mt-0.5">100 - MAPE</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-center shadow-2xs">
                <div className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">Best Month</div>
                <div className="text-xs font-bold text-emerald-800 mt-0.5">{bestMonth?.display_date || '-'}</div>
                <div className="text-[9px] text-emerald-700 font-mono font-bold mt-0.5">
                  {bestMonth?.error_pct != null ? `${bestMonth.error_pct.toFixed(2)}% err` : '-'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-2xs">
                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Max Month Err</div>
                <div className="text-xs font-bold text-[#0F2D64] mt-0.5">{worstMonth?.display_date || '-'}</div>
                <div className="text-[9px] text-slate-600 font-mono font-bold mt-0.5">
                  {worstMonth?.error_pct != null ? `${worstMonth.error_pct.toFixed(2)}% err` : '-'}
                </div>
              </div>
            </div>

            {/* Actual vs Prediction Line Chart (Test Period) */}
            <div className="p-4 rounded-xl border border-[#F1F5F9] bg-[#FAFAFA]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Actual vs Prediction Comparison — {ea.n_months} Test Months ({firstTestDate} – {lastTestDate})
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5 text-[#047857]">
                    <span className="w-3.5 h-1 bg-[#10B981] inline-block rounded-full" />
                    Actual Ground Truth
                  </span>
                  <span className="flex items-center gap-1.5 text-[#2563EB]">
                    <span className="w-3.5 inline-block" style={{ borderTop: '2px dashed #2563EB' }} />
                    Model Test Prediction
                  </span>
                </div>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={errChartData} margin={{ top: 5, right: 12, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 9, fill: '#6B7280', fontWeight: 600 }}
                      angle={-40}
                      textAnchor="end"
                      interval={0}
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: '#6B7280' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={fmtAxis}
                    />
                    <Tooltip content={<ErrorLineTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="prediction"
                      name="Prediction"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      strokeDasharray="5 3"
                      dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Absolute Error Bar Chart */}
            <div className="p-4 rounded-xl border border-[#F1F5F9] bg-[#FAFAFA]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <BarChart2 className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Monthly Absolute Error Breakdown ({targetUnit})
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" /> ≤8%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 8–15%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &gt;15%
                  </span>
                </div>
              </div>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={errChartData} margin={{ top: 5, right: 8, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 9, fill: '#6B7280', fontWeight: 600 }}
                      angle={-40}
                      textAnchor="end"
                      interval={0}
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: '#6B7280' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={fmtAxis}
                    />
                    <Tooltip content={<ErrorBarTooltip />} />
                    <Bar dataKey="absError" name="Abs. Error" radius={[3, 3, 0, 0]} maxBarSize={26}>
                      {errChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.errPct > 15 ? '#EF4444' : entry.errPct > 8 ? '#F59E0B' : '#10B981'}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Table & CSV Export Button */}
            <div className="rounded-xl border border-[#E5E7EB] overflow-hidden bg-white">
              <div className="p-3 bg-[#F8FAFC] border-b border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Table className="w-4 h-4 text-[#10B981]" />
                  <span className="text-xs font-bold text-[#0F2D64] uppercase tracking-wider">
                    Monthly Error Breakdown Table ({ea.n_months} Months)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExportErrorCsv}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-white hover:bg-slate-50 border border-[#E5E7EB] text-[#0F2D64] text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Export Error CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] sticky top-0 z-10 text-slate-600 border-b border-[#E5E7EB] uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3 text-[#0F2D64]">Month</th>
                      <th className="py-2.5 px-3 text-[#10B981]">Actual Value</th>
                      <th className="py-2.5 px-3 text-[#2563EB]">Model Prediction</th>
                      <th className="py-2.5 px-3 text-slate-600">Signed Error</th>
                      <th className="py-2.5 px-3 text-slate-700">Absolute Error</th>
                      <th className="py-2.5 px-3 text-slate-700">Error (%)</th>
                      <th className="py-2.5 px-3 text-slate-700">Quality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {ea.monthly_errors.map((row, idx) => {
                      const err = row.error_pct ?? 0;
                      const badgeColor =
                        err <= 5
                          ? 'bg-emerald-50 text-[#047857] border-emerald-200'
                          : err <= 8
                            ? 'bg-blue-50 text-[#1E40AF] border-blue-200'
                            : err <= 15
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200';
                      const badgeLabel =
                        err <= 5 ? 'Exceptional' : err <= 8 ? 'High Precision' : err <= 15 ? 'Acceptable' : 'Outlier';
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/80 ${err > 15 ? 'bg-rose-50/40' : err > 8 ? 'bg-amber-50/40' : ''}`}
                        >
                          <td className="py-2 px-3 font-bold text-[#0F2D64]">{row.display_date}</td>
                          <td className="py-2 px-3 font-mono text-[#047857] font-bold">{formatValue(row.actual)}</td>
                          <td className="py-2 px-3 font-mono text-[#2563EB] font-bold">{formatValue(row.prediction)}</td>
                          <td
                            className={`py-2 px-3 font-mono font-bold ${row.error >= 0 ? 'text-[#047857]' : 'text-rose-600'
                              }`}
                          >
                            {row.error >= 0 ? '+' : ''}
                            {formatValue(row.error)}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-[#0F2D64]">
                            {formatValue(row.absolute_error)}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-[#0F2D64]">
                            {row.error_pct != null ? `${row.error_pct.toFixed(2)}%` : '-'}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                              {badgeLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
