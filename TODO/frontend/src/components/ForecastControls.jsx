import React from 'react';
import { 
  Sliders, 
  Play, 
  Scale, 
  Download, 
  RotateCcw, 
  Sparkles, 
  Calendar,
  Building2,
  Layers
} from 'lucide-react';

export default function ForecastControls({
  level,
  setLevel,
  selectedInsurer,
  setSelectedInsurer,
  selectedCategory,
  setSelectedCategory,
  target,
  setTarget,
  horizon,
  setHorizon,
  selectedModel,
  setSelectedModel,
  metadata,
  onGenerateForecast,
  onCompareModels,
  onExportForecast,
  onReset,
  loading,
  loadingCompare
}) {
  const horizons = [3, 6, 12, 18, 24];

  const models = [
    { id: 'auto', label: 'Auto (Best Evaluated Model)', badge: 'Recommended' },
    { id: 'seasonal_naive', label: 'Seasonal Naive (12m Cycle)' },
    { id: 'linear_regression', label: 'Linear Regression (Trend + Harmonics)' },
    { id: 'sarima', label: 'SARIMA / SARIMAX' },
    { id: 'prophet', label: 'Prophet / Holt-Winters Fallback' },
    { id: 'lstm', label: 'LSTM Neural Network (Deep Learning)' },
  ];

  const levels = [
    { id: 'industry', label: 'Industry Level', desc: 'All Indian Life Insurers' },
    { id: 'insurer', label: 'Insurer Level', desc: 'Single Specific Insurer' },
    { id: 'category', label: 'Category Level', desc: 'IRDAI Line of Business' },
    { id: 'insurer_category', label: 'Insurer + Category', desc: 'Granular Segment' },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-[#0F2D64]" />
          <h2 className="text-base font-bold text-[#0F2D64]">Forecasting Configuration</h2>
        </div>
        <button
          onClick={onReset}
          className="flex items-center space-x-1 text-xs text-[#6B7280] hover:text-[#0F2D64] transition-colors font-semibold"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Target Selector Toggle */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
          Target Variable
        </label>
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => setTarget('premium_month_cr')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              target === 'premium_month_cr'
                ? 'bg-[#0F2D64] text-white shadow-sm'
                : 'text-[#4B5563] hover:text-[#0F2D64]'
            }`}
          >
            New Business Premium (₹ Cr)
          </button>
          <button
            type="button"
            onClick={() => setTarget('policies_month')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              target === 'policies_month'
                ? 'bg-[#0F2D64] text-white shadow-sm'
                : 'text-[#4B5563] hover:text-[#0F2D64]'
            }`}
          >
            Number of Policies
          </button>
        </div>
      </div>

      {/* Level Selection Pills */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
          Forecasting Aggregation Level
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {levels.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setLevel(lvl.id)}
              className={`p-3 text-left rounded-xl border transition-all ${
                level === lvl.id
                  ? 'bg-[#F0F6FF] border-[#0F2D64] text-[#0F2D64] font-bold shadow-sm'
                  : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#4B5563] hover:border-[#CBD5E1] hover:text-[#0F2D64]'
              }`}
            >
              <div className="text-xs font-bold">{lvl.label}</div>
              <div className="text-[10px] text-[#6B7280] mt-0.5 font-medium">{lvl.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Conditional Insurer and Category Selectors (Category on Left, Insurer on Right) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(level === 'category' || level === 'insurer_category') && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2 flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-[#0F2D64]" />
              <span>Select Product Category</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-xs text-[#1F2937] font-semibold focus:outline-none focus:border-[#0F2D64] transition-colors"
            >
              {metadata?.categories?.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {(level === 'insurer' || level === 'insurer_category') && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2 flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5 text-[#0F2D64]" />
              <span>Select Life Insurer</span>
            </label>
            <select
              value={selectedInsurer}
              onChange={(e) => setSelectedInsurer(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-xs text-[#1F2937] font-semibold focus:outline-none focus:border-[#0F2D64] transition-colors"
            >
              {metadata?.insurers?.map((ins) => (
                <option key={ins} value={ins}>
                  {ins}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Horizon Selector Buttons */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280] flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-[#0F2D64]" />
            <span>Forecast Horizon</span>
          </label>
          <span className="text-xs text-[#10B981] font-bold">{horizon} Months Out</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {horizons.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHorizon(h)}
              className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                horizon === h
                  ? 'bg-[#0F2D64] border-[#0F2D64] text-white shadow-sm'
                  : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#4B5563] hover:border-[#CBD5E1] hover:text-[#0F2D64]'
              }`}
            >
              {h}m {h === 24 ? '★' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Model Selection Dropdown */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2 flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Forecasting Model</span>
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-xs text-[#1F2937] font-semibold focus:outline-none focus:border-[#0F2D64] transition-colors"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} {m.badge ? `★ (${m.badge})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onGenerateForecast}
          disabled={loading}
          className="sm:col-span-2 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#0F2D64] hover:bg-[#2563EB] text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{loading ? 'Executing ML Pipeline...' : 'Generate Forecast'}</span>
        </button>

        <button
          type="button"
          onClick={onCompareModels}
          disabled={loadingCompare}
          className="flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl bg-[#F0F6FF] hover:bg-[#E8F1FF] border border-[#D1E4FF] text-[#0F2D64] font-bold text-xs disabled:opacity-50 transition-all cursor-pointer"
        >
          <Scale className="w-4 h-4 text-[#2563EB]" />
          <span>{loadingCompare ? 'Evaluating...' : 'Compare'}</span>
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onExportForecast}
          disabled={loading}
          className="flex items-center space-x-1.5 text-xs text-[#6B7280] hover:text-[#0F2D64] font-bold transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Forecast CSV</span>
        </button>
      </div>
    </div>
  );
}
