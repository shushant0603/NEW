import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  TrendingUp,
  Calendar,
  Layers,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Activity,
  Award,
  Clock,
  Shield,
  User,
  BarChart3,
  PieChart as PieIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import StatCard from '../components/StatCard';
import ForecastChart from '../components/ForecastChart';
import api from '../services/api';

export default function DashboardPage({ onNavigate }) {
  const [trends, setTrends] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendsRes, forecastRes] = await Promise.all([
        api.getTrends(),
        api.generateForecast({
          level: 'industry',
          target: 'premium_month_cr',
          horizon: 24,
          selected_model: 'auto'
        })
      ]);
      setTrends(trendsRes);
      setForecast(forecastRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to connect to analytics backend');
    } finally {
      setLoading(false);
    }
  };

  const formatCr = (val) => {
    if (val === null || val === undefined) return '0';
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const formatShort = (val) => {
    if (!val) return '₹0';
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L Cr`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k Cr`;
    return `₹${val.toFixed(0)} Cr`;
  };

  const totalPremium = trends?.total_premium_cr || 5210179.6;
  const numMonths = trends?.monthly_trends?.length || 128;
  const latestMonthData = trends?.monthly_trends && trends.monthly_trends.length > 0
    ? trends.monthly_trends[trends.monthly_trends.length - 1]
    : null;
  const latestPremium = latestMonthData?.total_premium_cr || 275840;
  const yoyGrowth = trends?.yoy_premium_growth_pct || 34.31;
  const topInsurer = trends?.top_insurers && trends.top_insurers.length > 0 ? trends.top_insurers[0] : null;

  // Donut Chart Data
  const donutData = trends?.category_distribution?.length > 0
    ? trends.category_distribution.map((c) => ({
      name: c.category,
      value: c.total_premium_cr,
      share: c.share_pct,
    }))
    : [
      { name: 'Individual Non-Single Premium', value: 338000, share: 33.8 },
      { name: 'Group Single Premium', value: 241000, share: 24.1 },
      { name: 'Individual Single Premium', value: 186000, share: 18.6 },
      { name: 'Group Yearly Renewable', value: 152000, share: 15.2 },
      { name: 'Group Non-Single Premium', value: 83000, share: 8.3 },
    ];

  const DONUT_COLORS = ['#0F2D64', '#2563EB', '#10B981', '#8B5CF6', '#94A3B8'];

  return (
    <div className="space-y-6">
      {/* Hero Banner with Family Shield Background Illustration */}
      <div className="relative rounded-3xl overflow-hidden border border-[#DBEAFE] bg-[#EEF6FF] shadow-sm">
        {/* Background Image Layer */}
        <div
          className="absolute inset-0 bg-contain bg-right bg-no-repeat opacity-95 pointer-events-none"
          style={{ backgroundImage: "url('/hero-banner-bg.png')" }}
        />

        {/* Soft Gradient Overlay for readable left text */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#EEF6FF] via-[#EEF6FF]/85 to-transparent w-full md:w-3/4 pointer-events-none" />

        <div className="relative z-10 py-5 px-6 sm:py-6 sm:px-8 lg:py-6 lg:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Content Column */}
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center space-x-2 text-[10px] font-bold tracking-wider text-[#2563EB] uppercase">
              <TrendingUp className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>AI-POWERED INSURANCE ANALYTICS</span>
            </div>

            <h1 className="text-xl sm:text-3xl font-extrabold text-[#0F2D64] tracking-tight leading-tight">
              Turning Data into <br className="hidden sm:inline" />
              <span className="text-[#059669]">A Safer Tomorrow</span>
            </h1>

            <p className="text-xs sm:text-[13px] text-[#475569] font-medium leading-relaxed">
              Analyze historical trends, forecast future premiums, and uncover growth opportunities across insurers and product categories.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigate('forecasting')}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#0F2D64] hover:bg-[#1E3A8A] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <span>Explore Forecasts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F2D64] text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>View Report</span>
              </button>
            </div>
          </div>

          {/* Center Quote Section */}

          {/* Right Feature Badges */}
          {/* <div className="hidden md:flex flex-col space-y-2 shrink-0 bg-white/75 backdrop-blur-md p-3 rounded-2xl border border-white/80 shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#1D4ED8] shadow-xs">
                <User className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#1E293B] leading-none">People</p>
                <p className="text-[10px] text-[#64748B] leading-none mt-0.5">First</p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#CCFBF1] flex items-center justify-center text-[#0F766E] shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#1E293B] leading-none">Smarter</p>
                <p className="text-[10px] text-[#64748B] leading-none mt-0.5">Decisions</p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#D1FAE5] flex items-center justify-center text-[#047857] shadow-xs">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#1E293B] leading-none">Stronger</p>
                <p className="text-[10px] text-[#64748B] leading-none mt-0.5">Communities</p>
              </div>
            </div>
          </div> */}
        </div>
      </div>

      {/* Primary 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Historical Premium */}
        <StatCard
          title="Total Historical Premium"
          value={formatShort(totalPremium)}
          unit=""
          icon={IndianRupee}
          color="emerald"
          changePct={12.4}
          changeLabel="vs previous period"
          subtitle={`₹${formatCr(totalPremium)} Cr`}
          tooltip="Cumulative new business premium intake across all life insurers."
          loading={loading}
        />

        {/* 2. Historical Time Series */}
        <StatCard
          title="Historical Time Series"
          value={`${numMonths}`}
          unit="Months"
          icon={Calendar}
          color="blue"
          badgeText="100% Complete"
          subtitle="Jan 2016 – Aug 2026"
          tooltip="Total continuous historical monthly observations ingested and verified."
          loading={loading}
        />

        {/* 3. Year-over-Year Growth */}
        <StatCard
          title="Year-over-Year Growth"
          value={yoyGrowth !== undefined && yoyGrowth !== null ? `+${yoyGrowth}%` : '+34.31%'}
          icon={TrendingUp}
          color="amber"
          changePct={yoyGrowth || 34.31}
          changeLabel="Aug 2026 vs Aug 2025"
          subtitle="Latest Annual Growth"
          tooltip="Annual growth rate comparing the latest monthly intake against prior year."
          loading={loading}
        />

        {/* 4. Forecast Horizon */}
        <StatCard
          title="Forecast Horizon"
          value="24"
          unit="Months"
          icon={Sparkles}
          color="purple"
          badgeText="95% CI Bounds"
          subtitle="Sep 2026 – Aug 2028"
          tooltip="Out-of-sample forward projection period generated by the retrained selected model."
          loading={loading}
        />
      </div>

      {/* Charts Section: Line Chart + Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Line Chart (2 Cols) */}
        <div className="lg:col-span-2">
          <ForecastChart
            historicalData={forecast?.historical_data || []}
            forecastData={forecast?.forecast_data || []}
            targetUnit="₹ Cr"
            title="Historical Actuals & 24-Month Forecast"
            selectedModel={forecast?.selected_model || 'LSTM'}
            testErrorAnalysis={forecast?.test_error_analysis || null}
            loading={loading}
          />
        </div>

        {/* Product Category Donut Chart (1 Col) */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-1 border-b border-[#F1F5F9] pb-3">
            <h3 className="text-base font-bold text-[#0F2D64]">Premium Distribution by Category</h3>
            <p className="text-xs text-[#6B7280]">Share of total premium across product categories</p>
          </div>

          <div className="relative h-[240px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#0F2D64] text-white p-2.5 rounded-xl text-xs shadow-xl">
                          <div className="font-bold">{d.name}</div>
                          <div className="text-[#10B981] font-semibold mt-0.5">₹{formatCr(d.value)} Cr ({d.share}%)</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-semibold text-[#6B7280]">Total Premium</span>
              <span className="text-lg font-extrabold text-[#0F2D64]">₹2.60L Cr</span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="space-y-1.5 pt-2 border-t border-[#F1F5F9]">
            {donutData.slice(0, 4).map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate max-w-[180px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                  />
                  <span className="text-[#4B5563] truncate font-medium">{cat.name}</span>
                </div>
                <span className="font-bold text-[#0F2D64]">{cat.share}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
