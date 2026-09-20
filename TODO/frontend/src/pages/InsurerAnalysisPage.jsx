import React, { useState, useEffect } from 'react';
import {
  Building2,
  TrendingUp,
  PieChart as PieIcon,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Layers,
  Calendar,
  Filter,
  BarChart3,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import DataTable from '../components/DataTable';
import api from '../services/api';

const COLORS = ['#2563EB', '#10B981', '#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#6366F1', '#64748B'];

export default function InsurerAnalysisPage({ metadata }) {
  const [trends, setTrends] = useState(null);
  const [selectedInsurer, setSelectedInsurer] = useState('Life Insurance Corporation of India');
  const [insurerHistory, setInsurerHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [target, setTarget] = useState('premium_month_cr');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedInsurer) {
      fetchInsurerHistory(selectedInsurer, target);
    }
  }, [selectedInsurer, target]);

  const fetchInitialData = async () => {
    try {
      const res = await api.getTrends();
      setTrends(res);
      if (res.top_insurers && res.top_insurers.length > 0) {
        const lic = res.top_insurers.find((i) => i.insurer.toLowerCase().includes('corporation')) || res.top_insurers[0];
        setSelectedInsurer(lic.insurer);
      }
    } catch (err) {
      console.error('Failed to load insurer trends:', err);
    }
  };

  const fetchInsurerHistory = async (insName, tgt) => {
    setLoadingHistory(true);
    try {
      const res = await api.getHistorical({
        level: 'insurer',
        insurer: insName,
        target: tgt,
      });
      setInsurerHistory(res.data || []);
    } catch (err) {
      console.error('Failed to load insurer monthly history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatCr = (val) => {
    if (val === null || val === undefined) return '0';
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const insurersList = trends?.top_insurers || [];

  // Data for Market Share Donut (Top 7 + Others)
  const top7 = insurersList.slice(0, 7);
  const othersShare = insurersList.slice(7).reduce((acc, curr) => acc + curr.market_share_pct, 0);
  const marketShareData = [
    ...top7.map((i) => ({ name: i.insurer, value: i.market_share_pct })),
    ...(othersShare > 0 ? [{ name: 'Other Private Insurers', value: roundNum(othersShare) }] : []),
  ];

  // Data for Top 10 Horizontal Bar Chart
  const top10 = insurersList.slice(0, 10).map((i) => ({
    name: i.insurer.length > 18 ? i.insurer.slice(0, 18) + '...' : i.insurer,
    fullName: i.insurer,
    premium: i.latest_month_premium_cr,
    marketShare: i.market_share_pct,
  })).reverse();

  // Table Columns
  const columns = [
    {
      key: 'insurer',
      label: 'Insurer Name',
      sortable: true,
      render: (val, row) => (
        <button
          onClick={() => setSelectedInsurer(val)}
          className="text-left font-bold text-[#0F2D64] hover:text-[#2563EB] transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          {val === selectedInsurer && <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>}
          <span>{val}</span>
        </button>
      ),
    },
    {
      key: 'market_share_pct',
      label: 'Market Share (%)',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-bold text-[#047857] font-mono">
          {val}%
        </span>
      ),
    },
    {
      key: 'latest_month_premium_cr',
      label: 'Latest Month (₹ Cr)',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-mono text-slate-800 font-bold">₹{formatCr(val)}</span>,
    },
    {
      key: 'ytd_premium_cr',
      label: 'Fiscal YTD (₹ Cr)',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-mono text-slate-600 font-semibold">₹{formatCr(val)}</span>,
    },
    {
      key: 'yoy_premium_growth_pct',
      label: 'YoY Growth (%)',
      sortable: true,
      align: 'right',
      render: (val) => {
        if (val === null || val === undefined) return <span className="text-slate-400">-</span>;
        const isPos = val > 0;
        return (
          <span className={`font-bold inline-flex items-center ${isPos ? 'text-[#10B981]' : 'text-rose-600'}`}>
            {isPos ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
            {isPos ? `+${val}%` : `${val}%`}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#047857] bg-[#D1FAE5]/60 px-2.5 py-1 rounded-full border border-[#10B981]/30">
            Insurer Intelligence
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F2D64] mt-2">
            Life Insurer Market Share & Performance Analysis
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
            Examine market share distribution, monthly premium trajectories, and growth rates across all 28 registered Indian life insurers.
          </p>
        </div>

        {/* Insurer Selector Dropdown */}
        <div className="flex items-center space-x-2 shrink-0">
          <label className="text-xs font-bold text-slate-600">Active Insurer:</label>
          <select
            value={selectedInsurer}
            onChange={(e) => setSelectedInsurer(e.target.value)}
            className="px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#0F2D64] focus:outline-none focus:border-[#0F2D64] shadow-2xs"
          >
            {insurersList.map((ins) => (
              <option key={ins.insurer} value={ins.insurer}>
                {ins.insurer} ({ins.market_share_pct}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 2 Visuals: Market Share Donut + Top 10 Horizontal Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Share Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F2D64]">
                Life Insurance Market Share Distribution
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Latest reported month premium share (%) across insurers
              </p>
            </div>
            <span className="text-xs font-bold text-[#0F2D64] bg-[#F0F6FF] px-2.5 py-0.5 rounded-full border border-[#BFDBFE]">
              28 Insurers
            </span>
          </div>

          <div className="h-[280px] w-full pt-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={marketShareData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                >
                  {marketShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 p-3 rounded-xl text-xs shadow-xl">
                          <div className="font-bold text-[#0F2D64]">{d.name}</div>
                          <div className="text-[#2563EB] font-bold mt-1">Market Share: {d.value}%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-[11px] font-medium">
            {top7.slice(0, 4).map((i, idx) => (
              <div key={i.insurer} className="flex items-center space-x-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="truncate text-slate-600">{i.insurer.slice(0, 12)}</span>
                <span className="font-bold text-[#0F2D64]">{i.market_share_pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 10 Insurers Horizontal Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F2D64]">
                Top 10 Insurers by Latest Monthly Intake
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                New business premium underwritten in latest month (₹ Crore)
              </p>
            </div>
            <Award className="w-4.5 h-4.5 text-amber-500" />
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={top10}
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" stroke="#64748B" fontSize={10} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={10} width={90} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 p-3 rounded-xl text-xs shadow-xl">
                          <div className="font-bold text-[#0F2D64]">{d.fullName}</div>
                          <div className="text-[#2563EB] font-bold mt-1">₹{formatCr(d.premium)} Cr</div>
                          <div className="text-slate-500 text-[10px] font-medium">Market Share: {d.marketShare}%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="premium" fill="#2563EB" radius={[0, 4, 4, 0]}>
                  {top10.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={entry.fullName === selectedInsurer ? '#0F2D64' : '#2563EB'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Selected Insurer Monthly Time-Series Trend Line */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-[#0F2D64]">
                Monthly Time-Series Trend: {selectedInsurer}
              </h3>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#F0F6FF] text-[#0F2D64] border border-[#BFDBFE]">
                128 Months
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Historical monthly progression for {selectedInsurer} from Jan 2016 to Aug 2026.
            </p>
          </div>

          {/* Metric Toggle */}
          <div className="flex items-center space-x-1.5 text-xs bg-[#F8FAFC] p-1 rounded-xl border border-[#E5E7EB]">
            <button
              onClick={() => setTarget('premium_month_cr')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                target === 'premium_month_cr'
                  ? 'bg-[#0F2D64] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-[#0F2D64]'
              }`}
            >
              Premium (₹ Cr)
            </button>
            <button
              onClick={() => setTarget('policies_month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                target === 'policies_month'
                  ? 'bg-[#0F2D64] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-[#0F2D64]'
              }`}
            >
              Policies Underwritten
            </button>
          </div>
        </div>

        <div className="h-[280px] w-full pt-2">
          {loadingHistory ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
              Loading {selectedInsurer} historical series...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={insurerHistory} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="insAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
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
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 p-3 rounded-xl text-xs shadow-xl">
                          <div className="font-bold text-[#0F2D64]">{d.display_date}</div>
                          <div className="text-[#2563EB] font-bold mt-1">
                            {formatCr(d.target_value)} {target === 'premium_month_cr' ? '₹ Cr' : 'Policies'}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="target_value"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#insAreaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Comprehensive Insurer Data Table */}
      <DataTable
        title="All Registered Life Insurers Performance Leaderboard"
        data={insurersList}
        columns={columns}
        pageSize={10}
        searchPlaceholder="Filter insurer name..."
        searchKeys={['insurer']}
      />
    </div>
  );
}

function roundNum(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

