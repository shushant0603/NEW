import React, { useState, useEffect } from 'react';
import {
  Layers as LayersIcon,
  PieChart as PieIcon,
  TrendingUp,
  BarChart3,
  Calendar,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  Tag,
  Info,
  ArrowUpRight
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
  AreaChart,
  Area
} from 'recharts';
import DataTable from '../components/DataTable';
import api from '../services/api';

const CAT_COLORS = ['#2563EB', '#10B981', '#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#6366F1', '#64748B'];

export default function CategoryAnalysisPage({ metadata }) {
  const [trends, setTrends] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryHistory, setCategoryHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [target, setTarget] = useState('premium_month_cr');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchCategoryHistory(selectedCategory, target);
    }
  }, [selectedCategory, target]);

  const fetchInitialData = async () => {
    try {
      const res = await api.getTrends();
      setTrends(res);
      if (res.category_distribution && res.category_distribution.length > 0) {
        setSelectedCategory(res.category_distribution[0].category);
      }
    } catch (err) {
      console.error('Failed to load category distribution:', err);
    }
  };

  const fetchCategoryHistory = async (catName, tgt) => {
    setLoadingHistory(true);
    try {
      const res = await api.getHistorical({
        level: 'category',
        category: catName,
        target: tgt,
      });
      setCategoryHistory(res.data || []);
    } catch (err) {
      console.error('Failed to load category monthly history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatCr = (val) => {
    if (val === null || val === undefined) return '0';
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const categoriesList = trends?.category_distribution || [];

  const donutData = categoriesList.map((c) => ({
    name: c.category,
    value: c.share_pct,
    premium: c.total_premium_cr,
    policies: c.total_policies
  }));

  const columns = [
    {
      key: 'category',
      label: 'Product Line (IRDAI Category)',
      sortable: true,
      render: (val) => (
        <button
          onClick={() => setSelectedCategory(val)}
          className="text-left font-bold text-[#0F2D64] hover:text-[#2563EB] transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          {val === selectedCategory && <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>}
          <span>{val}</span>
        </button>
      ),
    },
    {
      key: 'share_pct',
      label: 'Portfolio Share (%)',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-bold text-[#047857] font-mono">{val}%</span>,
    },
    {
      key: 'total_premium_cr',
      label: 'Cumulative Premium (₹ Cr)',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-mono text-slate-800 font-bold">₹{formatCr(val)}</span>,
    },
    {
      key: 'total_policies',
      label: 'Total Policies',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-mono text-slate-600 font-semibold">{val?.toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] bg-[#F0F6FF] px-2.5 py-1 rounded-full border border-[#BFDBFE]">
            Portfolio Mix Analysis
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F2D64] mt-2">
            IRDAI Product Category & Segment Breakdown
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
            Analyze historical new business premium distribution across individual and group lines of business, single vs non-single premiums, and renewal contracts.
          </p>
        </div>

        {/* Category Selector */}
        <div className="flex items-center space-x-2 shrink-0">
          <label className="text-xs font-bold text-slate-600">Product Line:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#0F2D64] focus:outline-none focus:border-[#0F2D64] shadow-2xs"
          >
            {categoriesList.map((cat) => (
              <option key={cat.category} value={cat.category}>
                {cat.category} ({cat.share_pct}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 2 Visuals: Distribution Donut + Premium Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Mix Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F2D64]">
                Product Category Share Distribution
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Cumulative historical premium share (%) by line of business
              </p>
            </div>
            <span className="text-xs font-bold text-[#0F2D64] bg-[#F0F6FF] px-2.5 py-0.5 rounded-full border border-[#BFDBFE]">
              {categoriesList.length} Categories
            </span>
          </div>

          <div className="h-[280px] w-full pt-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CAT_COLORS[index % CAT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 p-3 rounded-xl text-xs shadow-xl">
                          <div className="font-bold text-[#0F2D64]">{d.name}</div>
                          <div className="text-[#2563EB] font-bold mt-1">Share: {d.value}%</div>
                          <div className="text-slate-500 text-[10px] font-medium">Total: ₹{formatCr(d.premium)} Cr</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px] font-medium">
            {categoriesList.slice(0, 4).map((c, idx) => (
              <div key={c.category} className="flex items-center space-x-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[idx % CAT_COLORS.length] }}></span>
                <span className="truncate text-slate-600">{c.category}</span>
                <span className="font-bold text-[#0F2D64]">{c.share_pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Cumulative Premium Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F2D64]">
                Cumulative New Business Premium by Category
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Total ₹ Crore underwritten across entire 128-month observation horizon
              </p>
            </div>
            <LayersIcon className="w-4.5 h-4.5 text-[#2563EB]" />
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={categoriesList}
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" stroke="#64748B" fontSize={10} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                <YAxis dataKey="category" type="category" stroke="#64748B" fontSize={9} width={110} tickFormatter={(val) => val.length > 18 ? val.slice(0, 18) + '...' : val} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 p-3 rounded-xl text-xs shadow-xl">
                          <div className="font-bold text-[#0F2D64]">{d.category}</div>
                          <div className="text-[#2563EB] font-bold mt-1">₹{formatCr(d.total_premium_cr)} Cr</div>
                          <div className="text-slate-500 text-[10px] font-medium">Share: {d.share_pct}% | Policies: {d.total_policies?.toLocaleString()}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total_premium_cr" fill="#2563EB" radius={[0, 4, 4, 0]}>
                  {categoriesList.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={entry.category === selectedCategory ? '#0F2D64' : '#2563EB'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Selected Category Monthly Time-Series Trend Line */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-[#0F2D64]">
                Monthly Time-Series Trend: {selectedCategory}
              </h3>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#F0F6FF] text-[#0F2D64] border border-[#BFDBFE]">
                128 Months
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Historical monthly progression for {selectedCategory} from Jan 2016 to Aug 2026.
            </p>
          </div>

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
              Policies
            </button>
          </div>
        </div>

        <div className="h-[280px] w-full pt-2">
          {loadingHistory ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
              Loading {selectedCategory} historical series...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={categoryHistory} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="catAreaGrad" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#catAreaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Comprehensive Category Data Table */}
      <DataTable
        title="IRDAI Product Lines Performance & Share Summary"
        data={categoriesList}
        columns={columns}
        pageSize={8}
        searchPlaceholder="Search product category..."
        searchKeys={['category']}
      />
    </div>
  );
}

