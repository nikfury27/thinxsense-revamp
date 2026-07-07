import React, { useState } from 'react';
import { useHealthScoreTrend } from '../../hooks/useHealthScoreTrend';

export const TrendChart = ({ selectedRoom = 'all', roomScores = [], daysCount = 90 }) => {
  const [metricKey, setMetricKey] = useState('score'); // 'score' | 'verifiedCompliancePct' | 'coveragePct' | 'severityClearance'
  const { trendData, annotations, loading } = useHealthScoreTrend(selectedRoom, daysCount);
  const [hoveredAnnotation, setHoveredAnnotation] = useState(null);

  // Configuration for each metric
  const metrics = {
    score: { label: 'Health Score', color: '#3154ca', bg: 'bg-primary/10 text-primary' },
    verifiedCompliancePct: { label: 'Compliance', color: '#16a34a', bg: 'bg-green-100 text-green-800' },
    coveragePct: { label: 'Coverage', color: '#0d9488', bg: 'bg-teal-100 text-teal-800' },
    severityClearance: { label: 'Severity Clearance', color: '#dc2626', bg: 'bg-red-100 text-red-800' }
  };

  const activeMetric = metrics[metricKey];

  if (loading) {
    return (
      <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-md h-full flex items-center justify-center min-h-[350px]">
        <div className="animate-pulse w-full h-48 bg-outline-variant rounded" />
      </div>
    );
  }

  // Delta calculation relative to baseline (first day of range)
  const currentVal = trendData[trendData.length - 1]?.[metricKey] || 100.0;
  const initialVal = trendData[0]?.[metricKey] || 100.0;
  const delta = currentVal - initialVal;
  const deltaText = delta < 0 
    ? `down ${Math.abs(delta).toFixed(1)} points` 
    : delta > 0 
    ? `up ${Math.abs(delta).toFixed(1)} points` 
    : 'stable';

  // Find worst contributing room for narrative summary
  const worstRoom = roomScores[0];
  let narrativeDriver = '';
  if (worstRoom) {
    if (worstRoom.verifiedCompliancePct < worstRoom.coveragePct && worstRoom.verifiedCompliancePct < worstRoom.severityClearance) {
      narrativeDriver = `driven mainly by low compliance in ${worstRoom.roomName} (${worstRoom.verifiedCompliancePct.toFixed(1)}%)`;
    } else if (worstRoom.coveragePct < worstRoom.severityClearance) {
      narrativeDriver = `driven mainly by a coverage gap in ${worstRoom.roomName} (${worstRoom.coveragePct.toFixed(1)}%)`;
    } else if (worstRoom.totalSeverity > 0) {
      narrativeDriver = `driven mainly by a severe excursion in ${worstRoom.roomName} (severity index: ${worstRoom.totalSeverity.toFixed(1)})`;
    } else {
      narrativeDriver = `driven mainly by performance fluctuations in ${worstRoom.roomName}`;
    }
  }

  const autoSummary = worstRoom 
    ? `Facility health is ${currentVal.toFixed(1)}, ${deltaText} from last period, ${narrativeDriver}.`
    : `Facility health is ${currentVal.toFixed(1)}, ${deltaText} from last period.`;

  // SVG Chart math setup
  const width = 600;
  const height = 240;
  const padding = 50;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const scores = trendData.map(d => d[metricKey]);
  const maxVal = Math.max(...scores, 100.0);
  const minVal = Math.min(...scores, 0.0);
  const valRange = maxVal - minVal || 1.0;

  const getX = (index) => padding + (index / (trendData.length - 1)) * chartWidth;
  const getY = (val) => height - padding - ((val - minVal) / valRange) * chartHeight;

  const points = trendData.map((d, i) => `${getX(i)},${getY(d[metricKey])}`).join(' ');

  return (
    <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-md h-full flex flex-col min-h-[350px] relative">
      
      {/* 1. Narrative Auto-Summary banner */}
      <div className="mb-4 bg-primary/[0.03] border border-primary/10 rounded-xl p-4 flex gap-2 items-start text-xs text-on-surface-variant font-medium">
        <span className="material-symbols-outlined text-[18px] text-primary mt-0.5 shrink-0">chat_bubble</span>
        <p className="leading-normal">{autoSummary}</p>
      </div>

      {/* Header controls & Multi-metric selectors */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-outline-variant/30 pb-3">
        <div>
          <h3 className="font-bold text-sm text-primary">Executive Performance History</h3>
          <p className="text-[11px] text-on-surface-variant">Click tabs below to overlay specific metrics on the chart</p>
        </div>
        
        {/* Toggle selector buttons */}
        <div className="flex flex-wrap gap-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg p-1">
          {Object.keys(metrics).map((key) => (
            <button
              key={key}
              onClick={() => setMetricKey(key)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                metricKey === key
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              {metrics[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas wrapper */}
      <div className="flex-1 w-full overflow-hidden relative flex flex-col justify-center min-h-[180px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Y-axis gridlines */}
          {[0, 25, 50, 75, 100].map((yVal, i) => {
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
          
          {/* X-axis date tags (every 15 days for clean spacing) */}
          {trendData.filter((_, i) => i % Math.max(1, Math.round(daysCount / 6)) === 0).map((d, i) => {
            const step = Math.max(1, Math.round(daysCount / 6));
            return (
              <text key={i} x={getX(i * step)} y={height - padding + 18} fontSize="9" fill="#94a3b8" textAnchor="middle" className="font-mono">
                {d.date}
              </text>
            );
          })}

          {/* Chart Line path */}
          <polyline 
            fill="none" 
            stroke={activeMetric.color} 
            strokeWidth="4" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            points={points} 
          />
          
          {/* Chart Fill area */}
          <path 
            d={`M ${getX(0)} ${height - padding} L ${points} L ${getX(trendData.length - 1)} ${height - padding} Z`} 
            fill={`url(#glow-${metricKey})`} 
            opacity="0.12" 
          />
          
          {/* Event Annotations markers */}
          {annotations.map((ann, idx) => {
            const x = getX(ann.dayIndex);
            const yVal = trendData[ann.dayIndex]?.[metricKey] || 0.0;
            const y = getY(yVal);
            
            return (
              <g 
                key={idx} 
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredAnnotation(ann)}
                onMouseLeave={() => setHoveredAnnotation(null)}
              >
                {/* Outer pulsing ring */}
                <circle
                  cx={x}
                  cy={y}
                  r="8"
                  fill="none"
                  stroke={ann.type === 'excursion' ? '#dc2626' : '#eab308'}
                  strokeWidth="1.5"
                  className="animate-ping"
                  opacity="0.4"
                />
                
                {/* Center marker */}
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill={ann.type === 'excursion' ? '#dc2626' : '#eab308'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-all group-hover:scale-125"
                />
              </g>
            );
          })}

          <defs>
            <linearGradient id={`glow-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeMetric.color} />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
          </defs>
        </svg>

        {/* Hover annotation Tooltip card overlay */}
        {hoveredAnnotation && (
          <div 
            className="absolute bg-slate-900 text-white text-[11px] p-3 rounded-xl shadow-xl border border-slate-700 z-30 max-w-[200px] pointer-events-none select-none transition-all duration-150 animate-fadeIn"
            style={{
              left: `${(getX(hoveredAnnotation.dayIndex) / width) * 100}%`,
              top: `${(getY(trendData[hoveredAnnotation.dayIndex]?.[metricKey] || 0.0) / height) * 100 - 10}%`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="font-bold flex items-center gap-1 text-[11px]">
              <span className="material-symbols-outlined text-[13px] text-yellow-400">warning</span>
              <span>{hoveredAnnotation.type === 'excursion' ? 'Excursion Event' : 'Coverage Dropped'}</span>
            </div>
            <p className="mt-1 font-medium text-slate-200 leading-tight">{hoveredAnnotation.label}</p>
            <span className="text-[9px] text-slate-400 block mt-1 font-mono">{hoveredAnnotation.dateStr}</span>
          </div>
        )}
      </div>

      {/* Date scale label */}
      <div className="mt-2 text-right text-[10px] text-on-surface-variant font-mono">
        Viewing: last {daysCount} days
      </div>
    </div>
  );
};

export default TrendChart;
