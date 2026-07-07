import React from 'react';
import { useHealthScoreTrend } from '../../hooks/useHealthScoreTrend';

export const TrendChart = () => {
  const { trendData, loading } = useHealthScoreTrend();

  if (loading) {
    return (
      <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-md h-full flex items-center justify-center min-h-[300px]">
        <div className="animate-pulse w-full h-48 bg-outline-variant rounded" />
      </div>
    );
  }

  const width = 600;
  const height = 300;
  const padding = 50;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const scores = trendData.map(d => d.score);
  const maxVal = Math.max(...scores, 100);
  const minVal = Math.min(...scores, 50);
  const valRange = maxVal - minVal || 1;

  const getX = (index) => padding + (index / (trendData.length - 1)) * chartWidth;
  const getY = (val) => height - padding - ((val - minVal) / valRange) * chartHeight;

  const points = trendData.map((d, i) => `${getX(i)},${getY(d.score)}`).join(' ');

  return (
    <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-md h-full flex flex-col min-h-[300px]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold text-sm text-primary">Executive Health Index Trend</h3>
          <p className="text-xs text-on-surface-variant">Last 90 days rolling window performance</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-secondary font-bold block uppercase">Current Index</span>
          <strong className="text-lg font-mono text-primary font-black">
            {trendData[trendData.length - 1]?.score}%
          </strong>
        </div>
      </div>

      <div className="flex-1 w-full overflow-hidden relative flex flex-col justify-center min-h-[200px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Y-axis grids */}
          {[...Array(5)].map((_, i) => {
            const yVal = minVal + (valRange / 4) * i;
            const yPos = getY(yVal);
            return (
              <g key={i}>
                <line x1={padding} y1={yPos} x2={width - padding} y2={yPos} stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x={padding - 10} y={yPos + 4} fontSize="9" fill="#94a3b8" textAnchor="end" className="font-mono">
                  {yVal.toFixed(0)}%
                </text>
              </g>
            );
          })}
          
          {/* X-axis dates (show every 15 days to avoid overlap) */}
          {trendData.filter((_, i) => i % 15 === 0).map((d, i) => {
            const index = i * 15;
            return (
              <text key={i} x={getX(index)} y={height - padding + 18} fontSize="9" fill="#94a3b8" textAnchor="middle" className="font-mono">
                {d.date}
              </text>
            );
          })}

          {/* Chart Line */}
          <polyline fill="none" stroke="#3154ca" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points} />
          
          {/* Chart Area Fill */}
          <path d={`M ${getX(0)} ${height - padding} L ${points} L ${getX(trendData.length - 1)} ${height - padding} Z`} fill="url(#trendGlow)" opacity="0.15" />
          
          <defs>
            <linearGradient id="trendGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3154ca" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default TrendChart;
