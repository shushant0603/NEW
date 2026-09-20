import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

export default function StatCard({
  title,
  value,
  unit,
  changePct,
  changeLabel = 'vs previous period',
  icon: Icon,
  color = 'emerald',
  subtitle,
  tooltip,
  loading = false,
  badgeText,
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const isPositive = changePct !== undefined && changePct !== null && changePct > 0;
  const isNegative = changePct !== undefined && changePct !== null && changePct < 0;

  const colorVariants = {
    emerald: {
      iconBg: 'bg-[#D1FAE5] text-[#10B981]',
      accentBar: 'bg-[#10B981]',
    },
    blue: {
      iconBg: 'bg-[#DBEAFE] text-[#2563EB]',
      accentBar: 'bg-[#2563EB]',
    },
    amber: {
      iconBg: 'bg-[#FEF3C7] text-[#D97706]',
      accentBar: 'bg-[#D97706]',
    },
    rose: {
      iconBg: 'bg-[#FFE4E6] text-[#E11D48]',
      accentBar: 'bg-[#E11D48]',
    },
    purple: {
      iconBg: 'bg-[#F3E8FF] text-[#9333EA]',
      accentBar: 'bg-[#9333EA]',
    },
  };

  const selectedColor = colorVariants[color] || colorVariants.emerald;

  if (loading) {
    return (
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <div className="w-24 h-4 bg-slate-200 animate-pulse rounded-md" />
          <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse" />
        </div>
        <div className="w-32 h-8 bg-slate-200 animate-pulse rounded-md" />
        <div className="flex justify-between items-center pt-2">
          <div className="w-20 h-4 bg-slate-200 animate-pulse rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm relative overflow-hidden hover:shadow-md hover:border-[#CBD5E1] transition-all duration-200">
      {/* Top Subtle Accent Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${selectedColor.accentBar}`} />

      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-1.5">
          <span className="text-xs font-semibold text-[#6B7280]">
            {title}
          </span>
          {tooltip && (
            <div className="relative inline-block">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
                className="text-[#9CA3AF] hover:text-[#0F2D64] transition-colors p-0.5"
                aria-label={`Info about ${title}`}
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              {showTooltip && (
                <div className="absolute left-0 bottom-full mb-2 w-56 p-2.5 bg-[#0F2D64] text-white text-[11px] leading-relaxed rounded-xl shadow-2xl z-50 pointer-events-none">
                  {tooltip}
                </div>
              )}
            </div>
          )}
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-xl ${selectedColor.iconBg} shrink-0`}>
            <Icon className="w-5 h-5 stroke-[2.2]" />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="mt-3 flex items-baseline space-x-2">
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F2D64]">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-semibold text-[#6B7280]">
            {unit}
          </span>
        )}
      </div>

      {/* Footer Info & Trend Badge */}
      <div className="mt-4 flex items-center justify-between text-xs pt-2 border-t border-[#F1F5F9]">
        {changePct !== undefined && changePct !== null ? (
          <div
            className={`inline-flex items-center font-bold px-2.5 py-1 rounded-full text-[11px] ${
              isPositive
                ? 'bg-[#D1FAE5] text-[#047857]'
                : isNegative
                ? 'bg-[#FFE4E6] text-[#BE123C]'
                : 'bg-[#F1F5F9] text-[#475569]'
            }`}
          >
            {isPositive && <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 stroke-[3]" />}
            {isNegative && <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 stroke-[3]" />}
            <span>
              {isPositive ? `+${changePct}%` : `${changePct}%`} {changeLabel}
            </span>
          </div>
        ) : badgeText ? (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#E8F1FF] text-[#0F2D64]">
            {badgeText}
          </span>
        ) : (
          <span className="text-[#6B7280] text-[11px] font-medium">Empirical Metric</span>
        )}

        {subtitle && (
          <span className="text-[#6B7280] text-[11px] truncate max-w-[160px] font-medium" title={subtitle}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
