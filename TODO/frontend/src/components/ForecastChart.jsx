import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

export default function ForecastChart({
  historicalData = [],
  forecastData = [],
  targetUnit = '₹ Crore',
  title = 'Historical Actuals & 24-Month Forecast',
  selectedModel = 'Model',
}) {
  const lastHistorical = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;

  const chartData = [
    ...historicalData.map((d) => ({
      date: d.date,
      display_date: d.display_date,
      historical: d.target_value,
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload;
      return (
        <div className="bg-[#0F2D64] text-white p-3.5 rounded-xl shadow-2xl text-xs space-y-2 z-50 min-w-[200px]">
          <p className="font-bold text-slate-200 border-b border-blue-900/60 pb-1.5">{dataPoint?.display_date || label}</p>
          
          {dataPoint?.historical !== null && dataPoint?.historical !== undefined && (
            <div className="flex items-center justify-between space-x-3">
              <span className="flex items-center text-[#10B981] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#10B981] mr-1.5"></span>
                Actual:
              </span>
              <span className="font-bold text-white">{formatValue(dataPoint.historical)} {targetUnit}</span>
            </div>
          )}

          {dataPoint?.forecast !== null && dataPoint?.forecast !== undefined && !dataPoint?.is_anchor && (
            <>
              <div className="flex items-center justify-between space-x-3">
                <span className="flex items-center text-[#60A5FA] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB] mr-1.5"></span>
                  Forecast ({selectedModel}):
                </span>
                <span className="font-bold text-white">{formatValue(dataPoint.forecast)} {targetUnit}</span>
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

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-4">
        <div>
          <h3 className="text-base font-bold text-[#0F2D64] tracking-tight">{title}</h3>
          <p className="text-xs text-[#6B7280] font-medium mt-0.5">
            Monthly premium trends with forecast projections ({historicalData.length}m historical + {forecastData.length}m forecast)
          </p>
        </div>
        <div className="flex items-center space-x-4 text-xs font-semibold">
          <span className="flex items-center text-[#10B981]">
            <span className="w-3.5 h-1 bg-[#10B981] rounded-full mr-1.5 inline-block"></span> Actual
          </span>
          <span className="flex items-center text-[#2563EB]">
            <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#2563EB] mr-1.5 inline-block"></span> Forecast
          </span>
          <span className="flex items-center text-[#60A5FA]">
            <span className="w-3.5 h-2 bg-[#2563EB]/20 rounded-xs mr-1.5 inline-block"></span> 95% CI
          </span>
        </div>
      </div>

      <div className="h-[380px] w-full pt-2">
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
              tickFormatter={(val) => {
                if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                return val;
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Marker Line separating historical from forecast */}
            {lastHistorical && (
              <ReferenceLine
                x={lastHistorical.display_date}
                stroke="#94A3B8"
                strokeDasharray="3 3"
                label={{
                  value: 'Forecast Horizon ➔',
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
    </div>
  );
}
