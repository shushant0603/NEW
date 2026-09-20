import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  Layers,
  Building2,
  Info,
  Filter,
  BarChart3,
  LineChart,
  Activity,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
  Legend
} from 'recharts';
import api from '../services/api';

export default function HistoricalAnalyticsPage({ metadata }) {
  const [trends, setTrends] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState('premium_month_cr');
  const [showRollingAvg, setShowRollingAvg] = useState(true);
  const [timeRange, setTimeRange] = useState('all'); // 'all', '5y', '3y'

  useEffect(() => {
    fetchAnalytics();
  }, [target]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [trendsRes, forecastRes] = await Promise.all([
        api.getTrends(),
        api.generateForecast({
          level: 'industry',
          target,
          horizon: 24,
          selected_model: 'auto'
        })
      ]);
      setTrends(trendsRes);
      setForecast(forecastRes);
    } catch (err) {
      console.error('Failed to load historical analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatVal = (val) => {
    if (val === null || val === undefined) return '0';
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const targetUnit = target === 'premium_month_cr' ? '₹ Crore' : 'Policies';

  // Compute 12-month Rolling Average on historical trends
  const monthlyTrendsRaw = trends?.monthly_trends || [];
  const monthlyDataWithRolling = monthlyTrendsRaw.map((item, idx, arr) => {
    const val = target === 'premium_month_cr' ? item.total_premium_cr : item.total_policies;
    let rollingAvg = null;
    if (idx >= 11) {
      const window = arr.slice(idx - 11, idx + 1);
      const sum = window.reduce((acc, curr) => acc + (target === 'premium_month_cr' ? curr.total_premium_cr : curr.total_policies), 0);
      rollingAvg = roundNum(sum / 12);
    }
    return {
      ...item,
      val,
      rollingAvg
    };
  });

  // Filter time range
  const filteredHistorical = monthlyDataWithRolling.filter((item) => {
    if (timeRange === '3y') return item.date >= '2023-01-01';
    if (timeRange === '5y') return item.date >= '2021-01-01';
    return true;
  });

  // Blend Chart B: Historical vs Forecast
  const historicalPoints = forecast?.historical_data || [];
  const forecastPoints = forecast?.forecast_data || [];
  const lastHistorical = historicalPoints.length > 0 ? historicalPoints[historicalPoints.length - 1] : null;

  const transitionData = [
    ...historicalPoints.map((d) => ({
      date: d.display_date,
      historical: d.target_value,
      forecast: null,
      lower: null,
      upper: null,
    })),
    ...(lastHistorical
      ? [{
          date: lastHistorical.display_date,
          historical: null,
          forecast: lastHistorical.target_value,
          lower: lastHistorical.target_value,
          upper: lastHistorical.target_value,
        }]
      : []),
    ...forecastPoints.map((d) => ({
      date: d.display_date,
      historical: null,
      forecast: d.point_forecast,
      lower: d.lower_bound,
      upper: d.upper_bound,
      interval: d.lower_bound !== null && d.upper_bound !== null ? [d.lower_bound, d.upper_bound] : null
    }))
  ];

  // Chart D: Yearly Comparison Data
  const yearlyData = trends?.yearly_comparison || [];

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F2D64] bg-[#F0F6FF] px-2.5 py-1 rounded-full border border-[#BFDBFE]">
            Time-Series Deep Dive
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F2D64] mt-2">
            Historical Insurance Analytics & Seasonality
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
            Empirical multi-year time-series trends from January 2016 to August 2026 across monthly intake, calendar seasonality, and annual totals.
          </p>
        </div>

        {/* Target Variable Toggle */}
        <div className="flex items-center space-x-1.5 bg-[#F8FAFC] p-1.5 rounded-xl border border-[#E5E7EB] shrink-0">
          <button
            onClick={() => setTarget('premium_month_cr')}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              target === 'premium_month_cr'
                ? 'bg-[#0F2D64] text-white shadow-2xs'
                : 'text-slate-600 hover:text-[#0F2D64]'
            }`}
          >
            Premium (₹ Cr)
          </button>
          <button
            onClick={() => setTarget('policies_month')}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              target === 'policies_month'
                ? 'bg-[#0F2D64] text-white shadow-2xs'
                : 'text-slate-600 hover:text-[#0F2D64]'
            }`}
          >
            Policy Count
          </button>
        </div>
      </div>

      {/* CHART A: Historical Monthly Premium Trend */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#0F2D64]">
              A. 128-Month Historical Premium Trend (2016 – 2026)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Monthly premium collection (₹ Cr) with 12-month rolling average line
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Range Pills */}
            <div className="flex items-center space-x-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E5E7EB] text-[11px]">
              {['all', '5y', '3y'].map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors uppercase cursor-pointer ${
                    timeRange === r
                      ? 'bg-[#0F2D64] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-[#0F2D64]'
                  }`}
                >
                  {r === 'all' ? 'All (128m)' : r}
                </button>
              ))}
            </div>

            {/* Rolling Average Toggle */}
            <label className="flex items-center space-x-1.5 text-slate-600 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={showRollingAvg}
                onChange={(e) => setShowRollingAvg(e.target.checked)}
                className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
              />
              <span>12m Rolling Avg</span>
            </label>
          </div>
        </div>

        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredHistorical} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="histAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="display_date"
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={30}
              />
              <YAxis
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                tickFormatter={(val) => {
                  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                  return val;
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xl text-xs space-y-1.5 z-50">
                        <p className="font-bold text-[#0F2D64] border-b border-slate-100 pb-1">
                          {d.display_date || label}
                        </p>
                        <div className="flex justify-between space-x-4 text-[#2563EB] font-bold">
                          <span>Monthly Actual:</span>
                          <span className="font-bold text-[#0F2D64]">
                            {formatVal(d.val)} {targetUnit}
                          </span>
                        </div>
                        {d.rollingAvg !== null && (
                          <div className="flex justify-between space-x-4 text-amber-600 font-bold">
                            <span>12m Rolling Mean:</span>
                            <span>
                              {formatVal(d.rollingAvg)} {targetUnit}
                            </span>
                          </div>
                        )}
                        {d.yoy_premium_growth_pct !== null && (
                          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between font-medium">
                            <span>YoY Growth:</span>
                            <span className={d.yoy_premium_growth_pct >= 0 ? 'text-[#10B981] font-bold' : 'text-rose-600 font-bold'}>
                              {d.yoy_premium_growth_pct > 0 ? '+' : ''}{d.yoy_premium_growth_pct}%
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="val"
                stroke="#2563EB"
                strokeWidth={2}
                fill="url(#histAreaGrad)"
                name="Monthly Intake"
              />
              {showRollingAvg && (
                <Line
                  type="monotone"
                  dataKey="rollingAvg"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                  name="12m Rolling Average"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100">
          <strong>Chart Note:</strong> Monthly historical premium trend from January 2016 to August 2026. The 12-month rolling average smooths out Section 80C tax-season peaks to reveal long-term compounding expansion.
        </p>
      </div>

      {/* CHART B: Historical vs Forecast Chart */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-[#0F2D64]">
                B. Historical Baseline & 24-Month Projected Horizon
              </h3>
              <span className="text-[10px] font-bold text-[#0F2D64] bg-[#F0F6FF] px-2 py-0.5 rounded-md border border-[#BFDBFE]">
                Out-of-Sample
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Distinguishing verified historical observations from model-projected 24 future periods with 95% uncertainty bounds.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs font-semibold">
            <span className="flex items-center text-[#2563EB]">
              <span className="w-3 h-0.5 bg-[#2563EB] mr-1.5 inline-block"></span> Historical Actual
            </span>
            <span className="flex items-center text-amber-600">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-600 mr-1.5 inline-block"></span> Forecast
            </span>
            <span className="flex items-center text-cyan-600">
              <span className="w-3 h-2 bg-cyan-100 border border-cyan-300 rounded-2xs mr-1.5 inline-block"></span> 95% Bounds
            </span>
          </div>
        </div>

        <div className="h-[320px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={transitionData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="transAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xl text-xs space-y-1.5 z-50">
                        <p className="font-bold text-[#0F2D64] border-b border-slate-100 pb-1">
                          {d.date || label}
                        </p>
                        {d.historical !== null && (
                          <div className="flex justify-between space-x-3 text-[#2563EB] font-bold">
                            <span>Actual Historical:</span>
                            <span className="font-bold text-[#0F2D64]">₹{formatVal(d.historical)} Cr</span>
                          </div>
                        )}
                        {d.forecast !== null && (
                          <div className="flex justify-between space-x-3 text-amber-600 font-bold">
                            <span>Point Forecast:</span>
                            <span className="font-bold text-amber-700">₹{formatVal(d.forecast)} Cr</span>
                          </div>
                        )}
                        {d.lower !== null && d.upper !== null && (
                          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between font-medium">
                            <span>95% Bounds:</span>
                            <span className="font-mono">[₹{formatVal(d.lower)} – ₹{formatVal(d.upper)}]</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {lastHistorical && (
                <ReferenceLine
                  x={lastHistorical.display_date}
                  stroke="#94A3B8"
                  strokeDasharray="3 3"
                  label={{
                    value: 'Forecast Starting Point ➔',
                    position: 'insideTopRight',
                    fill: '#0F2D64',
                    fontSize: 10,
                    fontWeight: 700
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="interval"
                stroke="#06B6D4"
                strokeOpacity={0.4}
                fill="url(#transAreaGrad)"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="historical"
                stroke="#2563EB"
                strokeWidth={2}
                dot={{ r: 1.5, fill: '#2563EB' }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2.5, fill: '#F59E0B' }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: CHART C (Monthly Seasonality) & CHART D (Yearly Comparison) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART C: Monthly Seasonality Chart */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F2D64]">
                C. Monthly Seasonality Profile (Jan – Dec)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Average historical monthly intake across the calendar year
              </p>
            </div>
            <span className="text-xs font-bold text-[#047857] bg-[#D1FAE5]/60 px-2.5 py-0.5 rounded-full border border-[#10B981]/30">
              128m Averages
            </span>
          </div>

          <div className="h-[210px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends?.seasonality_profile || []} margin={{ top: 10, right: 10, left: 5, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month_name" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 p-3 rounded-xl text-xs shadow-xl space-y-1">
                          <div className="font-bold text-[#0F2D64]">{d.month_name} Seasonal Average</div>
                          <div className="text-[#2563EB] font-bold mt-1">₹{formatVal(d.avg_premium_cr)} Cr</div>
                          <div className="text-slate-500 text-[10px] font-medium">{d.avg_policies?.toLocaleString()} Policies</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avg_premium_cr" radius={[4, 4, 0, 0]}>
                  {trends?.seasonality_profile?.map((entry, index) => (
                    <Cell
                      key={`season-cell-${index}`}
                      fill={entry.month_name === 'Mar' ? '#F59E0B' : entry.month_name === 'Apr' ? '#06B6D4' : '#2563EB'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-500 font-medium">
            <strong>Observation:</strong> March exhibits the highest average premium due to fiscal tax-savings incentives, followed by an immediate April contraction before rising sequentially into Q2 and Q3.
          </p>
        </div>

        {/* CHART D: Yearly Premium Comparison */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F2D64]">
                D. Yearly Premium Comparison (2016 – 2026)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Total annual premium comparison across historical calendar years
              </p>
            </div>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              2026 = 8m Incomplete
            </span>
          </div>

          <div className="h-[210px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="year" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 p-3 rounded-xl text-xs shadow-xl space-y-1">
                          <div className="font-bold text-[#0F2D64]">Year {d.year}</div>
                          <div className="text-[#2563EB] font-bold">Total: ₹{formatVal(d.total_premium_cr)} Cr</div>
                          <div className="text-slate-500 text-[10px] font-medium">
                            Observations: {d.months_count} Months {!d.is_complete_year ? '(Incomplete Year: Jan–Aug)' : '(Complete Year)'}
                          </div>
                          {d.yoy_growth_pct !== null && (
                            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 font-medium">
                              YoY Growth: <strong className={d.yoy_growth_pct >= 0 ? 'text-[#10B981]' : 'text-rose-600'}>{d.yoy_growth_pct > 0 ? '+' : ''}{d.yoy_growth_pct}%</strong>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total_premium_cr" radius={[4, 4, 0, 0]}>
                  {yearlyData.map((entry, index) => (
                    <Cell
                      key={`yearly-${index}`}
                      fill={!entry.is_complete_year ? '#F59E0B' : '#2563EB'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-[11px] text-slate-600 font-semibold flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] inline-block"></span>
              <span>Complete Years (12m)</span>
            </span>
            <span className="flex items-center space-x-1.5 text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span>2026 Incomplete (8 Months: Jan–Aug)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function roundNum(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

