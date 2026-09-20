import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Scale,
  ShieldCheck,
  Award,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Database,
  Calendar,
  Layers,
  RotateCw,
  TrendingUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  LineChart,
  Line
} from 'recharts';
import ComparisonTable from '../components/ComparisonTable';
import api from '../services/api';

export default function ModelEvaluationPage({ metadata }) {
  const [level, setLevel] = useState('industry');
  const [selectedInsurer, setSelectedInsurer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [target, setTarget] = useState('premium_month_cr');
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    runModelBenchmark();
  }, [level, selectedInsurer, selectedCategory, target]);

  const runModelBenchmark = async () => {
    setLoading(true);
    try {
      const payload = {
        level,
        target,
        ...(level === 'insurer' || level === 'insurer_category' ? { insurer: selectedInsurer } : {}),
        ...(level === 'category' || level === 'insurer_category' ? { category: selectedCategory } : {}),
      };
      const res = await api.compareModels(payload);
      setCompareData(res);
    } catch (err) {
      console.error('Failed to run model benchmark:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartMetrics = compareData?.metrics?.filter((m) => m.smape !== null && m.smape !== undefined) || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] bg-[#F0F6FF] px-2.5 py-1 rounded-full border border-[#BFDBFE]">
          Empirical Validation & Benchmark
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F2D64] mt-2">
          Chronological Time-Series Model Evaluation
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
          Multi-model out-of-sample holdout comparison evaluated on symmetric Mean Absolute Percentage Error (sMAPE) and Root Mean Squared Error (RMSE). Models are selected strictly on the validation partition with zero lookahead bias.
        </p>
      </div>

      {/* 3-Way Chronological Data Split Segmented Bar & Cards */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-[#10B981]" />
            <div>
              <h3 className="text-sm font-bold text-[#0F2D64]">
                Chronological 3-Way Splitting Architecture (128 Months Total)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Prevents data leakage: Training $\rightarrow$ Validation Selection $\rightarrow$ Untouched Test Holdout $\rightarrow$ Full Retraining $\rightarrow$ 24m Horizon
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#D1FAE5]/60 text-[#047857] border border-[#10B981]/30">
            Zero Leakage Enforced
          </span>
        </div>

        {/* Visual Segmented Progress Bar */}
        <div className="space-y-2 pt-1">
          <div className="h-4 rounded-full overflow-hidden flex bg-[#F8FAFC] p-0.5 border border-[#E5E7EB]">
            {/* Training Segment (70.3%) */}
            <div
              style={{ width: '70.3%' }}
              className="bg-[#2563EB] h-full rounded-l-full relative group transition-all"
              title="Training Fit: 90 Months (Jan 2016 – Jun 2023)"
            />
            {/* Validation Segment (14.8%) */}
            <div
              style={{ width: '14.8%' }}
              className="bg-[#10B981] h-full relative group transition-all"
              title="Validation Selection: 19 Months (Jul 2023 – Jan 2025)"
            />
            {/* Test Segment (14.8%) */}
            <div
              style={{ width: '14.9%' }}
              className="bg-[#6366F1] h-full rounded-r-full relative group transition-all"
              title="Untouched Test Holdout: 19 Months (Feb 2025 – Aug 2026)"
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-600 font-semibold pt-1">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] inline-block"></span>
              <span>1. Training Fit (90m, 70.3%)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block"></span>
              <span>2. Validation Selection (19m, 14.8%)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1] inline-block"></span>
              <span>3. Untouched Test (19m, 14.8%)</span>
            </span>
            <span className="flex items-center space-x-1.5 text-[#047857]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block"></span>
              <span>4. Retrain 100% & Forecast 24m</span>
            </span>
          </div>
        </div>

        {/* 4 Architectural Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
            <span className="text-[10px] text-slate-500 uppercase font-bold">1. Training Partition</span>
            <div className="text-base font-bold text-[#0F2D64] mt-1">90 Months</div>
            <div className="text-xs text-[#2563EB] font-bold">Jan 2016 – Jun 2023</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Initial candidate model fitting</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#D1FAE5]/40 border border-[#10B981]/30">
            <span className="text-[10px] text-[#047857] uppercase font-bold">2. Validation Partition</span>
            <div className="text-base font-bold text-[#0F2D64] mt-1">19 Months</div>
            <div className="text-xs text-[#047857] font-bold">Jul 2023 – Jan 2025</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Drives model choice (lowest sMAPE)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F0F6FF] border border-[#BFDBFE]">
            <span className="text-[10px] text-[#1E40AF] uppercase font-bold">3. Untouched Test Partition</span>
            <div className="text-base font-bold text-[#0F2D64] mt-1">19 Months</div>
            <div className="text-xs text-[#1E40AF] font-bold">Feb 2025 – Aug 2026</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Unbiased holdout generalization check</div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] text-amber-800 uppercase font-bold">4. Retrained Horizon</span>
            <div className="text-base font-bold text-[#0F2D64] mt-1">24 Months</div>
            <div className="text-xs text-amber-800 font-bold">Sep 2026 – Aug 2028</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Retrained on 100% data (128m)</div>
          </div>
        </div>
      </div>

      {/* Benchmark Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="text-slate-500 mr-2 font-bold">Level:</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="bg-white px-3 py-1.5 rounded-xl border border-[#E5E7EB] text-slate-800 font-semibold focus:outline-none focus:border-[#0F2D64]"
            >
              <option value="industry">Industry Level</option>
              <option value="insurer">Insurer Level</option>
              <option value="category">Category Level</option>
              <option value="insurer_category">Insurer + Category</option>
            </select>
          </div>

          {(level === 'insurer' || level === 'insurer_category') && (
            <div>
              <label className="text-slate-500 mr-2 font-bold">Insurer:</label>
              <select
                value={selectedInsurer}
                onChange={(e) => setSelectedInsurer(e.target.value)}
                className="bg-white px-3 py-1.5 rounded-xl border border-[#E5E7EB] text-slate-800 font-semibold focus:outline-none focus:border-[#0F2D64]"
              >
                {metadata?.insurers?.map((ins) => (
                  <option key={ins} value={ins}>{ins}</option>
                ))}
              </select>
            </div>
          )}

          {(level === 'category' || level === 'insurer_category') && (
            <div>
              <label className="text-slate-500 mr-2 font-bold">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white px-3 py-1.5 rounded-xl border border-[#E5E7EB] text-slate-800 font-semibold focus:outline-none focus:border-[#0F2D64]"
              >
                {metadata?.categories?.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-slate-500 mr-2 font-bold">Target:</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="bg-white px-3 py-1.5 rounded-xl border border-[#E5E7EB] text-slate-800 font-semibold focus:outline-none focus:border-[#0F2D64]"
            >
              <option value="premium_month_cr">New Business Premium (₹ Cr)</option>
              <option value="policies_month">Policies Count</option>
            </select>
          </div>
        </div>

        <button
          onClick={runModelBenchmark}
          disabled={loading}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#0F2D64] hover:bg-[#2563EB] text-white font-bold text-xs shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Evaluating Models...' : 'Re-Run Evaluation'}</span>
        </button>
      </div>

      {/* Model Performance Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dual sMAPE Comparison Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F2D64]">
                Holdout sMAPE (%): Validation vs Untouched Test
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Symmetric Mean Absolute Percentage Error (lower values represent superior fit)
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartMetrics} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="model_name"
                  stroke="#64748B"
                  fontSize={10}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis stroke="#64748B" fontSize={10} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <div className="font-bold text-[#0F2D64]">{d.model_name}</div>
                          <div className="text-[#10B981] font-bold">Validation sMAPE: {d.smape}%</div>
                          <div className="text-[#2563EB] font-bold">Untouched Test sMAPE: {d.test_smape !== undefined ? `${d.test_smape}%` : '-'}</div>
                          <div className="text-slate-500 text-[10px] pt-1 border-t border-slate-100 font-medium">
                            Val RMSE: {d.rmse} | Test RMSE: {d.test_rmse || '-'}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                />
                <Bar name="Val sMAPE (Selection)" dataKey="smape" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar name="Test sMAPE (Holdout)" dataKey="test_smape" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Methodology & Generalization Safeguard */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-[#2563EB] mb-2">
              <BookOpen className="w-4.5 h-4.5" />
              <h3 className="text-sm font-bold text-[#0F2D64]">
                Evaluation & Selection Principles
              </h3>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Standard cross-validation randomly shuffles observations, which severely leaks future information into historical parameters.
            </p>
            <div className="mt-3 space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                <strong className="text-[#047857] block">1. Selection Phase (Validation Partition):</strong>
                <span className="text-slate-600 text-[11px] font-medium">
                  All models are trained on 90 months (Jan 2016 – Jun 2023) and forecasted over the 19-month validation period (Jul 2023 – Jan 2025). The architecture with the lowest validation sMAPE is auto-selected.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                <strong className="text-[#2563EB] block">2. Generalization Check (Untouched Test Partition):</strong>
                <span className="text-slate-600 text-[11px] font-medium">
                  The test holdout (Feb 2025 – Aug 2026) is never accessed during selection. It is evaluated post-selection to verify that the chosen model generalizes robustly without lookahead bias.
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F0F6FF] border border-[#BFDBFE] text-[#1E40AF] text-xs font-semibold flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0" />
            <span>Zero Lookahead Bias: Model selection decisions are strictly locked prior to holdout evaluation.</span>
          </div>
        </div>
      </div>

      {/* Comprehensive Benchmark Table */}
      <ComparisonTable
        metrics={compareData?.metrics || []}
        recommendedModel={compareData?.recommended_model}
        recommendationReason={compareData?.recommendation_reason}
        targetUnit={compareData?.target_unit || '₹ Cr'}
      />
    </div>
  );
}

