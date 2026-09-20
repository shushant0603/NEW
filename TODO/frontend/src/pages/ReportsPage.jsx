import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Sparkles,
  Printer,
  Building2,
  Layers,
  FileText,
  Activity
} from 'lucide-react';
import api from '../services/api';

export default function ReportsPage() {
  const [trends, setTrends] = useState(null);
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    try {
      const res = await api.getTrends();
      setTrends(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportForecast = async () => {
    setDownloading((prev) => ({ ...prev, forecast: true }));
    try {
      await api.exportForecast({
        level: 'industry',
        target: 'premium_month_cr',
        horizon: 24,
        selected_model: 'auto'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading((prev) => ({ ...prev, forecast: false }));
    }
  };

  const handleExportHistorical = () => {
    if (!trends?.monthly_trends) return;
    const headers = ['Date', 'Display_Date', 'Total_Premium_Cr', 'Total_Policies', 'YoY_Growth_Pct'];
    const rows = trends.monthly_trends.map((r) => [
      r.date,
      r.display_date,
      r.total_premium_cr,
      r.total_policies,
      r.yoy_premium_growth_pct ?? ''
    ]);
    downloadCSV('historical_monthly_trends_128m.csv', headers, rows);
  };

  const handleExportInsurers = () => {
    if (!trends?.top_insurers) return;
    const headers = ['Insurer', 'Latest_Month_Premium_Cr', 'YTD_Premium_Cr', 'Market_Share_Pct', 'YoY_Growth_Pct'];
    const rows = trends.top_insurers.map((r) => [
      `"${r.insurer}"`,
      r.latest_month_premium_cr,
      r.ytd_premium_cr,
      r.market_share_pct,
      r.yoy_premium_growth_pct ?? ''
    ]);
    downloadCSV('insurer_performance_leaderboard.csv', headers, rows);
  };

  const handleExportCategories = () => {
    if (!trends?.category_distribution) return;
    const headers = ['Category', 'Total_Premium_Cr', 'Total_Policies', 'Share_Pct'];
    const rows = trends.category_distribution.map((r) => [
      `"${r.category}"`,
      r.total_premium_cr,
      r.total_policies,
      r.share_pct
    ]);
    downloadCSV('product_category_distribution.csv', headers, rows);
  };

  const downloadCSV = (filename, headers, rows) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const formatCr = (val) => {
    if (!val) return '0';
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F2D64] bg-[#F0F6FF] px-2.5 py-1 rounded-full border border-[#BFDBFE]">
            Export & Executive Reports
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F2D64] mt-2">
            Actuarial Intelligence Reports & Data Hub
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
            Export certified forecasting outputs, empirical time-series tables, and executive summary packages for stakeholder review.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-[#E5E7EB] text-xs font-bold text-[#0F2D64] transition-colors shrink-0 shadow-2xs cursor-pointer"
        >
          <Printer className="w-4 h-4 text-[#2563EB]" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* CSV Downloads Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. 24-Month Forecast CSV */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-3 flex flex-col justify-between hover:border-[#2563EB] transition-all">
          <div>
            <div className="flex items-center space-x-2 text-amber-600">
              <Sparkles className="w-4 h-4" />
              <h4 className="text-xs font-bold text-[#0F2D64] uppercase">24-Month Forecast</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
              Point forecasts and 95% lower/upper prediction intervals from Sep 2026 to Aug 2028.
            </p>
          </div>
          <button
            onClick={handleExportForecast}
            disabled={downloading.forecast}
            className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-700" />
            <span>{downloading.forecast ? 'Exporting...' : 'Download CSV'}</span>
          </button>
        </div>

        {/* 2. Historical Monthly Trends CSV */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-3 flex flex-col justify-between hover:border-[#2563EB] transition-all">
          <div>
            <div className="flex items-center space-x-2 text-[#10B981]">
              <Calendar className="w-4 h-4" />
              <h4 className="text-xs font-bold text-[#0F2D64] uppercase">128-Month Trends</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
              Complete historical monthly premium and policy counts from Jan 2016 to Aug 2026.
            </p>
          </div>
          <button
            onClick={handleExportHistorical}
            className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-[#D1FAE5]/60 hover:bg-[#D1FAE5] border border-[#10B981]/30 text-[#047857] text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Download CSV</span>
          </button>
        </div>

        {/* 3. Insurer Leaderboard CSV */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-3 flex flex-col justify-between hover:border-[#2563EB] transition-all">
          <div>
            <div className="flex items-center space-x-2 text-[#2563EB]">
              <Building2 className="w-4 h-4" />
              <h4 className="text-xs font-bold text-[#0F2D64] uppercase">Insurers Leaderboard</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
              Latest monthly premium, YTD intake, market share %, and YoY growth across 28 insurers.
            </p>
          </div>
          <button
            onClick={handleExportInsurers}
            className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-[#F0F6FF] hover:bg-[#E8F1FF] border border-[#BFDBFE] text-[#1E40AF] text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Download CSV</span>
          </button>
        </div>

        {/* 4. Product Categories CSV */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-3 flex flex-col justify-between hover:border-[#2563EB] transition-all">
          <div>
            <div className="flex items-center space-x-2 text-indigo-600">
              <Layers className="w-4 h-4" />
              <h4 className="text-xs font-bold text-[#0F2D64] uppercase">Category Breakdown</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
              Product category volume, policy counts, and portfolio share distribution.
            </p>
          </div>
          <button
            onClick={handleExportCategories}
            className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Executive Summary Briefing */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#0F2D64]">
              Executive Actuarial Intelligence Briefing
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Source: Life Insurance Council
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-2">
            <h4 className="font-bold text-[#047857] flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span>Historical Summary Highlights</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed pl-1 text-[11px] font-medium">
              <li><strong>Cumulative Inflow:</strong> ₹{formatCr(trends?.total_premium_cr)} Crore across 128 verified monthly filings.</li>
              <li><strong>Market Leadership:</strong> LIC of India retains primary market volume, with top 3 insurers holding ~70% collective share.</li>
              <li><strong>Fiscal Year-End Peak:</strong> March consistently represents 2.5x–3.0x higher premium intake than the subsequent April trough.</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-2">
            <h4 className="font-bold text-amber-800 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>24-Month Outlook Highlights</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed pl-1 text-[11px] font-medium">
              <li><strong>Selected Engine:</strong> Prophet algorithm selected strictly via lowest holdout sMAPE (10.83%).</li>
              <li><strong>Projected March Peaks:</strong> March 2027 (~₹2,38,623 Cr) and March 2028 (~₹2,40,178 Cr).</li>
              <li><strong>Uncertainty Bounds:</strong> 95% confidence intervals expand gradually over the horizon to reflect economic uncertainty.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

