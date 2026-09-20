import React from 'react';
import { Award, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export default function ComparisonTable({ metrics = [], recommendedModel, recommendationReason, targetUnit = '₹ Cr' }) {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] text-center text-slate-400 text-xs shadow-sm">
        No model evaluation data available. Run model comparison to benchmark models.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recommendation Banner */}
      {recommendedModel && (
        <div className="p-4 rounded-2xl bg-[#D1FAE5]/60 border border-[#10B981]/30 flex items-start space-x-3 shadow-sm">
          <div className="p-2 rounded-xl bg-[#10B981]/20 text-[#047857] shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#047857]">Recommended Model</span>
              <span className="px-2 py-0.5 rounded-full bg-[#10B981] text-white text-xs font-bold shadow-2xs">
                {recommendedModel}
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1 font-medium">{recommendationReason}</p>
          </div>
        </div>
      )}

      {/* Benchmarking Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-sm">
        <div className="p-4 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#F8FAFC]">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F2D64]">
              Chronological 3-Way Split Benchmark (Selection vs. Untouched Test)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Selection is strictly determined by <strong className="text-[#0F2D64]">Validation sMAPE</strong> (Jul 2023 – Jan 2025). <strong className="text-[#0F2D64]">Test Holdout</strong> (Feb 2025 – Aug 2026) validates generalization without leakage.
            </p>
          </div>
          <span className="text-[11px] text-slate-500 flex items-center space-x-1 shrink-0 font-medium">
            <Info className="w-3.5 h-3.5 text-[#2563EB] mr-1" />
            Lower sMAPE/RMSE is superior
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-slate-600 border-b border-[#E5E7EB] uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4 text-[#0F2D64]">Model Architecture</th>
                <th className="py-3 px-3 text-[#047857]">Val sMAPE (%) ★</th>
                <th className="py-3 px-3 text-[#047857]">Val RMSE ({targetUnit})</th>
                <th className="py-3 px-3 text-[#2563EB]">Test sMAPE (%)</th>
                <th className="py-3 px-3 text-[#2563EB]">Test RMSE ({targetUnit})</th>
                <th className="py-3 px-3 text-[#0F2D64]">Status</th>
                <th className="py-3 px-4 text-[#0F2D64]">Validation Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.map((m, idx) => {
                const isBest = m.is_recommended || m.model_name === recommendedModel;
                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isBest ? 'bg-[#F0F6FF] font-semibold' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-[#0F2D64] flex items-center space-x-2">
                      {isBest && <Award className="w-4 h-4 text-[#10B981] shrink-0" />}
                      <span>{m.model_name}</span>
                      {isBest && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981] text-white font-bold">
                          Selected
                        </span>
                      )}
                    </td>

                    {/* Validation Metrics (Selection) */}
                    <td className="py-3 px-3 font-bold text-[#047857] font-mono">
                      {m.smape !== null && m.smape !== undefined ? `${m.smape}%` : '-'}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-700">
                      {m.rmse !== null && m.rmse !== undefined ? m.rmse.toLocaleString() : '-'}
                    </td>

                    {/* Untouched Test Metrics (Holdout) */}
                    <td className="py-3 px-3 font-bold text-[#2563EB] font-mono">
                      {m.test_smape !== null && m.test_smape !== undefined ? `${m.test_smape}%` : '-'}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-700">
                      {m.test_rmse !== null && m.test_rmse !== undefined ? m.test_rmse.toLocaleString() : '-'}
                    </td>

                    <td className="py-3 px-3">
                      {m.status === 'Success' ? (
                        <span className="inline-flex items-center text-[#10B981] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Success
                        </span>
                      ) : m.status?.includes('Fallback') ? (
                        <span className="inline-flex items-center text-amber-600 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Fallback
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-rose-600 font-bold">
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Failed
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {m.notes || m.error_message || 'Fitted on 90m train window'}
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
}

