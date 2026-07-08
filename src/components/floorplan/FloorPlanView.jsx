import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../../api/apiService';

// ─── Constants ────────────────────────────────────────────────────────────────
const SENSOR_RANGE_M = 100; // real-world monitoring radius in metres

// ─── Sensor visual state ──────────────────────────────────────────────────────
// Gradient color: red for breach, green for everything else (incl. trend-risk).
// Dot color: yellow for trend-risk (approaching limit but still within range).
// Offline sensors: grey dot, NO gradient painted.
const BREACH_THRESHOLD = 25.0;

const getSensorVisual = (sensor) => {
  if (sensor.status === 'offline') {
    return { dot: '#9ca3af', glow: null, label: 'Offline' };
  }
  // Breach: status warning OR temp actually over threshold (defensive against stale status)
  if (sensor.status === 'warning' || sensor.temp > BREACH_THRESHOLD) {
    return { dot: '#ef4444', glow: [239, 68, 68], label: 'Breach' };
  }
  if (sensor.isTrendBreachRisk) {
    return { dot: '#f59e0b', glow: [16, 185, 129], label: 'Approaching limit' };
  }
  return { dot: '#10b981', glow: [16, 185, 129], label: 'Normal' };
};

const classifySensor = (sensor, allSensors) => {
  if (sensor.status === 'offline') return 'normal';
  const neighbors = allSensors.filter(
    s => s.group === sensor.group && s.id !== sensor.id && s.status !== 'offline'
  );
  if (neighbors.length === 0) return 'isolated';
  const avg = neighbors.reduce((a, s) => a + s.temp, 0) / neighbors.length;
  if (sensor.temp > BREACH_THRESHOLD && Math.abs(sensor.temp - avg) > 3.0) return 'isolated_anomaly';
  if (sensor.temp > BREACH_THRESHOLD) return 'room_wide';
  return 'normal';
};

// ─── Draw radar zones ─────────────────────────────────────────────────────────
// radiusPx has no cap — a 100m sensor in an 8m room floods the entire canvas.
// Offline sensors are skipped entirely (no gradient).
// Paint order: normal first, then breach on top.
const drawZones = (canvas, sensors, positions, roomW, roomH, hoveredId = null) => {
  if (!canvas) return;
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const scale = Math.min(W / roomW, H / roomH);
  const getRadius = () => SENSOR_RANGE_M * scale;

  // Paint normal/trend-risk first, breach on top
  const placed = sensors
    .filter(s => positions[s.id] && s.status !== 'offline')
    .sort((a, b) => (a.status === 'warning' ? 1 : 0) - (b.status === 'warning' ? 1 : 0));

  placed.forEach(sensor => {
    const cx = positions[sensor.id].x * W;
    const cy = positions[sensor.id].y * H;
    const v  = getSensorVisual(sensor);
    const [r, g, b] = v.glow;
    const radiusPx = getRadius();

    // Soft, pleasing gradient — gentle centre bloom, fades cleanly
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radiusPx);
    grad.addColorStop(0,    `rgba(${r},${g},${b},0.38)`);
    grad.addColorStop(0.30, `rgba(${r},${g},${b},0.22)`);
    grad.addColorStop(0.60, `rgba(${r},${g},${b},0.10)`);
    grad.addColorStop(0.85, `rgba(${r},${g},${b},0.04)`);
    grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
    ctx.fill();
  });

  // Hover boundary circle — only for the hovered sensor, skip offline
  if (hoveredId) {
    const hs = sensors.find(s => s.id === hoveredId);
    if (hs && positions[hs.id] && hs.status !== 'offline') {
      const cx = positions[hs.id].x * W;
      const cy = positions[hs.id].y * H;
      const radiusPx = getRadius();
      const v = getSensorVisual(hs);
      const [r, g, b] = v.glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.30)`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
};

// ─── Nice tick generator (like a chart axis) ──────────────────────────────────
const getTicks = (totalUnits) => {
  const target = 6;
  const raw    = totalUnits / target;
  const mag    = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const nice   = [1, 2, 5, 10].find(n => n * mag >= raw) * mag;
  const ticks  = [];
  for (let v = 0; v <= totalUnits + 1e-9; v += nice) ticks.push(parseFloat(v.toFixed(4)));
  return ticks;
};

// ─── Hover card ───────────────────────────────────────────────────────────────
const SensorHoverCard = ({ sensor, allSensors, groupName }) => {
  const classification = classifySensor(sensor, allSensors);
  const neighbors = allSensors.filter(
    s => s.group === sensor.group && s.id !== sensor.id && s.status !== 'offline'
  );
  const threshold   = BREACH_THRESHOLD;
  const isOffline   = sensor.status === 'offline';
  const deviation   = parseFloat((sensor.temp - threshold).toFixed(1));
  // Offline sensors have no live excursion — stale temp readings must be ignored
  const isExcursion = !isOffline && sensor.temp > threshold;
  const esiSoFar    = isExcursion ? parseFloat((deviation * 45).toFixed(1)) : null;
  const v = getSensorVisual(sensor);

  return (
    <div className="w-[300px] bg-[#1e2433] text-white rounded-xl shadow-2xl border border-white/10 overflow-hidden text-sm">
      <div className="p-4 pb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[20px] mt-0.5" style={{ color: v.dot }}>
            {sensor.status === 'warning' ? 'warning' : sensor.status === 'online' ? 'check_circle' : 'circle'}
          </span>
          <div>
            <div className="font-bold text-base leading-tight">Sensor {sensor.id}</div>
            <div className="text-white/50 text-xs mt-0.5">{groupName} · {sensor.location}</div>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
          isOffline ? 'bg-white/10 text-white/50'
          : isExcursion ? 'bg-[#ba1a1a] text-white'
          : sensor.isTrendBreachRisk ? 'bg-[#92400e] text-[#fde68a]'
          : 'bg-white/10 text-white/70'
        }`}>
          {isOffline ? 'Offline' : isExcursion ? `Active · ${sensor.lastSeen}` : sensor.isTrendBreachRisk ? 'Approaching limit' : 'Normal'}
        </span>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold" style={{ color: v.dot }}>
            {sensor.temp}°C
          </span>
          <span className="text-white/50 text-xs">vs. limit {threshold.toFixed(1)}°C</span>
        </div>
        {isExcursion && (
          <div className="text-[#ff6b6b] text-xs mt-1 font-medium">
            +{deviation}°C over limit{sensor.slope > 0 ? ', still climbing' : ''}
          </div>
        )}
        {!isExcursion && sensor.isTrendBreachRisk && (
          <div className="text-[#fbbf24] text-xs mt-1 font-medium">
            Rising +{sensor.slope}°C/hr · breach in ~{sensor.projectedHoursToBreach}h
          </div>
        )}
      </div>

      <div className="mx-4 border-t border-white/10" />

      {esiSoFar !== null && (
        <div className="px-4 py-3">
          <div className="text-white/50 text-xs">Severity so far</div>
          <div className="font-bold text-sm mt-0.5">
            {esiSoFar} °C·min ·{' '}
            <span className="font-normal text-white/60">minor tier, recalculating as it continues</span>
          </div>
        </div>
      )}

      {neighbors.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-white/50 text-xs mb-2">Neighbour comparison</div>
          <div className="space-y-1">
            {neighbors.slice(0, 3).map(n => {
              const nv = getSensorVisual(n);
              return (
                <div key={n.id} className="flex justify-between text-xs">
                  <span className="font-bold">Sensor {n.id}</span>
                  <span style={{ color: nv.dot }}>{n.temp}°C · {nv.label.toLowerCase()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {classification === 'isolated_anomaly' && !isExcursion && (
        <div className="mx-3 mb-3 px-3 py-2.5 bg-[#7c5c00]/40 border border-[#f59e0b]/30 rounded-lg flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#f59e0b] shrink-0 mt-0.5">build</span>
          <span className="text-[#f59e0b] text-xs leading-snug">
            Isolated anomaly — neighbours remain in range. Likely a sensor fault, not a room-wide excursion.
          </span>
        </div>
      )}
      {classification === 'isolated_anomaly' && isExcursion && (
        <div className="mx-3 mb-3 px-3 py-2.5 bg-[#ba1a1a]/20 border border-[#f59e0b]/40 rounded-lg flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#f59e0b] shrink-0 mt-0.5">build</span>
          <span className="text-[#ff6b6b] text-xs leading-snug">
            Breach + isolated anomaly — neighbours are within range. This sensor may be faulty or in a localised hotspot. Verify physically.
          </span>
        </div>
      )}
      {classification === 'room_wide' && (
        <div className="mx-3 mb-3 px-3 py-2.5 bg-[#ba1a1a]/20 border border-[#ba1a1a]/30 rounded-lg flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#ff6b6b] shrink-0 mt-0.5">crisis_alert</span>
          <span className="text-[#ff6b6b] text-xs leading-snug">
            Room-wide excursion — multiple sensors confirm elevated temperatures.
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Legend ───────────────────────────────────────────────────────────────────
const Legend = ({ roomW, roomH, unit, useInterpolation, cols, rows }) => {
  const coversRoom = SENSOR_RANGE_M >= Math.max(roomW, roomH);
  const zoneW = (roomW / cols).toFixed(1);
  const zoneH = (roomH / rows).toFixed(1);
  return (
    <div className="bg-white border border-outline-variant rounded-lg p-3 text-xs space-y-2 shadow-sm w-44 shrink-0 self-start">
      <div className="font-bold text-secondary uppercase tracking-wider text-[10px]">Legend</div>

      {/* Dot states */}
      {[
        { color: '#10b981', label: 'Normal' },
        { color: '#ef4444', label: 'Breach (alert)' },
        { color: '#9ca3af', label: 'Offline' },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-on-surface-variant">{label}</span>
        </div>
      ))}

      {/* Approaching limit — yellow dot, green gradient */}
      <div className="flex items-start gap-2">
        <span className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ background: '#f59e0b' }} />
        <span className="text-on-surface-variant leading-tight">Approaching limit<br/><span className="text-[9px] text-outline">green zone, yellow dot</span></span>
      </div>

      {/* Isolated anomaly */}
      <div className="flex items-start gap-2 pt-1 border-t border-outline-variant/40">
        <span className="w-3 h-3 rounded-full shrink-0 mt-0.5 border-2 border-dashed border-[#f59e0b]" />
        <span className="text-on-surface-variant leading-tight">Isolated anomaly<br/><span className="text-[9px] text-outline">neighbours in range</span></span>
      </div>
      <div className="flex items-start gap-2">
        <span className="relative shrink-0 mt-0.5" style={{ width: 12, height: 12 }}>
          <span className="absolute inset-0 rounded-full" style={{ background: '#ef4444' }} />
          <span className="absolute rounded-full border-2 border-dashed border-[#f59e0b]" style={{ inset: -3 }} />
        </span>
        <span className="text-on-surface-variant leading-tight ml-1">Breach + anomaly<br/><span className="text-[9px] text-outline">verify physically</span></span>
      </div>

      <div className="pt-1 border-t border-outline-variant/40 space-y-1">
        <div className="text-[10px] text-secondary font-semibold">Sensor range</div>
        <div className="text-[10px] text-on-surface-variant">{SENSOR_RANGE_M}{unit} radius</div>
        <div className="text-[10px] text-on-surface-variant">
          {coversRoom ? '✓ Covers entire room' : `${((SENSOR_RANGE_M / Math.max(roomW, roomH)) * 100).toFixed(0)}% of room`}
        </div>
        <div className="text-[9px] text-outline italic">Hover sensor to see range</div>
      </div>

      <div className="pt-1 border-t border-outline-variant/40 space-y-1">
        <div className="text-[10px] text-secondary font-semibold">Zone grid</div>
        <div className="text-[10px] text-on-surface-variant">{cols} × {rows} zones</div>
        <div className="text-[10px] text-on-surface-variant font-mono">{zoneW}{unit} × {zoneH}{unit} each</div>
      </div>

      {useInterpolation && (
        <div className="text-[10px] text-orange-600 font-semibold pt-1 border-t border-outline-variant/40">
          ⚠ Interpolated — approximate
        </div>
      )}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const FloorPlanView = ({ group, allSensors, onSensorClick }) => {
  const [positions,    setPositions]    = useState({});
  const [dims,         setDims]         = useState({ width: 20, length: 15, unit: 'm' });
  const [dimsForm,     setDimsForm]     = useState(null);
  const [editMode,     setEditMode]     = useState(false);
  const [pendingPlace, setPendingPlace] = useState(null);
  const [dragging,     setDragging]     = useState(null);
  const [hoveredSensor, setHoveredSensor] = useState(null);
  const [hoverPos,     setHoverPos]     = useState({ x: 0, y: 0 });
  const [canvasSize,   setCanvasSize]   = useState({ w: 600, h: 400 });

  const zoneCanvasRef  = useRef(null);
  const floorRef       = useRef(null);
  const wrapRef        = useRef(null);
  const roRef          = useRef(null);
  const [floorWidth,   setFloorWidth]   = useState(0);
  const [floorHeight,  setFloorHeight]  = useState(0);

  const groupSensors = useMemo(
    () => allSensors.filter(s => s.group === group.name),
    [allSensors, group.name]
  );

  useEffect(() => {
    apiService.getSensorPositions(group.name).then(setPositions);
    apiService.getGroupDimensions(group.name).then(d => { setDims(d); setDimsForm({ ...d }); });
  }, [group.name]);

  // Keep canvas pixel size in sync with the div's actual rendered size
  useEffect(() => {
    if (!floorRef.current) return;
    roRef.current = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setCanvasSize({ w: Math.round(width), h: Math.round(height) });
        setFloorWidth(Math.round(width));
        setFloorHeight(Math.round(height));
      }
    });
    roRef.current.observe(floorRef.current);
    return () => roRef.current?.disconnect();
  }, []);

  useEffect(() => {
    drawZones(zoneCanvasRef.current, groupSensors, positions, dims.width, dims.length, hoveredSensor?.id ?? null);
  }, [groupSensors, positions, dims, canvasSize, hoveredSensor]);

  const xTicks = useMemo(() => getTicks(dims.width),  [dims.width]);
  const yTicks = useMemo(() => getTicks(dims.length), [dims.length]);

  const getFloorCoords = useCallback((e) => {
    const rect = floorRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top)  / rect.height)),
    };
  }, []);

  const handleFloorClick = useCallback(async (e) => {
    if (!editMode || !pendingPlace) return;
    const pos = getFloorCoords(e);
    setPositions(prev => ({ ...prev, [pendingPlace]: pos }));
    await apiService.saveSensorPosition(pendingPlace, pos);
    setPendingPlace(null);
  }, [editMode, pendingPlace, getFloorCoords]);

  const handleMouseDown = useCallback((e, id) => {
    if (!editMode) return;
    e.stopPropagation();
    setDragging(id);
  }, [editMode]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !editMode) return;
    setPositions(prev => ({ ...prev, [dragging]: getFloorCoords(e) }));
  }, [dragging, editMode, getFloorCoords]);

  const handleMouseUp = useCallback(async () => {
    if (dragging && positions[dragging]) {
      await apiService.saveSensorPosition(dragging, positions[dragging]);
    }
    setDragging(null);
  }, [dragging, positions]);

  const handleSensorHover = useCallback((e, sensor) => {
    if (editMode) return;
    setHoverPos({ x: e.clientX, y: e.clientY });
    setHoveredSensor(sensor);
  }, [editMode]);

  const handleSaveDims = async () => {
    const d = {
      width:  parseFloat(dimsForm.width)  || dims.width,
      length: parseFloat(dimsForm.length) || dims.length,
      unit:   dimsForm.unit,
    };
    setDims(d);
    setDimsForm({ ...d });
    await apiService.saveGroupDimensions(group.name, d);
  };

  const unplacedSensors = groupSensors.filter(s => !positions[s.id]);
  const placedSensors   = groupSensors.filter(s =>  positions[s.id]);
  const useInterpolation = placedSensors.length >= 6;
  const DOT = 14;

  // Zone grid dimensions — computed once, shared between SVG and Legend
  const cols = Math.max(2, Math.min(5, Math.round(dims.width  / 30)));
  const rows = Math.max(2, Math.min(4, Math.round(dims.length / 30)));
  const zoneW = parseFloat((dims.width  / cols).toFixed(1));
  const zoneH = parseFloat((dims.length / rows).toFixed(1));

  return (
    <div className="flex flex-col gap-3 h-full" ref={wrapRef}>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-on-surface">
            {dims.width}{dims.unit} × {dims.length}{dims.unit}
          </span>
          <span className="text-outline">·</span>
          <span className="text-secondary">
            1{dims.unit} = {(canvasSize.w / dims.width).toFixed(1)}px
          </span>
          {useInterpolation && (
            <span className="text-orange-600 font-bold">· Interpolated — approximate</span>
          )}
        </div>
        <button
          onClick={() => { setEditMode(v => !v); setPendingPlace(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
            editMode
              ? 'bg-primary text-white'
              : 'bg-white border border-outline-variant text-secondary hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">{editMode ? 'done' : 'edit'}</span>
          {editMode ? 'Done Editing' : 'Edit Layout'}
        </button>
      </div>

      {/* Dims editor */}
      {editMode && dimsForm && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs flex-wrap shrink-0">
          <span className="font-bold text-primary">Room Dimensions:</span>
          {['width', 'length'].map(field => (
            <label key={field} className="flex items-center gap-1 capitalize">
              {field}
              <input
                type="number" min="1"
                value={dimsForm[field]}
                onChange={e => setDimsForm(d => ({ ...d, [field]: e.target.value }))}
                className="w-16 px-2 py-1 border border-outline-variant rounded text-xs ml-1"
              />
            </label>
          ))}
          <select
            value={dimsForm.unit}
            onChange={e => setDimsForm(d => ({ ...d, unit: e.target.value }))}
            className="px-2 py-1 border border-outline-variant rounded text-xs"
          >
            <option value="m">m</option>
            <option value="ft">ft</option>
          </select>
          <button onClick={handleSaveDims} className="px-3 py-1 bg-primary text-white rounded text-xs font-semibold">
            Apply
          </button>
        </div>
      )}

      {/* Unplaced sensors */}
      {editMode && unplacedSensors.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs shrink-0">
          <span className="font-bold text-yellow-700">Click to place:</span>
          {unplacedSensors.map(s => (
            <button
              key={s.id}
              onClick={() => setPendingPlace(pendingPlace === s.id ? null : s.id)}
              className={`px-2 py-0.5 rounded font-mono font-semibold border transition-colors ${
                pendingPlace === s.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-outline-variant text-on-surface hover:bg-primary/5'
              }`}
            >
              {s.id}
            </button>
          ))}
          {pendingPlace && (
            <span className="text-primary font-semibold animate-pulse">→ Click on the floor plan to place</span>
          )}
        </div>
      )}

      {/* Floor plan + legend */}
      <div className="flex gap-4 flex-1 min-h-0">

        <div className="flex flex-col flex-1 min-w-0">
          {/* X-axis ticks — width pinned to actual floor plan pixel width */}
          <div
            className="relative h-5 ml-7 mb-0.5 shrink-0"
            style={{ width: floorWidth > 0 ? floorWidth : undefined }}
          >
            {xTicks.map(t => (
              <span
                key={t}
                className="absolute text-[9px] text-outline font-mono -translate-x-1/2"
                style={{ left: `${(t / dims.width) * 100}%` }}
              >
                {t}{dims.unit}
              </span>
            ))}
          </div>

          <div className="flex">
            {/* Y-axis ticks — height pinned to actual floor plan pixel height */}
            <div
              className="relative w-7 shrink-0"
              style={{ height: floorHeight > 0 ? floorHeight : undefined }}
            >
              {yTicks.map(t => (
                <span
                  key={t}
                  className="absolute text-[9px] text-outline font-mono right-1 -translate-y-1/2"
                  style={{ top: `${(t / dims.length) * 100}%` }}
                >
                  {t}
                </span>
              ))}
            </div>

            {/* Floor plan box — fixed sensible height, scales with viewport */}
            <div
              ref={floorRef}
              className={`relative flex-1 bg-[#f4f6fb] border-2 rounded-xl overflow-hidden ${
                editMode ? 'border-primary cursor-crosshair' : 'border-outline-variant'
              }`}
              style={{ height: 'clamp(320px, 55vh, 600px)' }}
              onClick={handleFloorClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { handleMouseUp(); setHoveredSensor(null); }}
            >
              {/* Radar zone canvas */}
              <canvas
                ref={zoneCanvasRef}
                width={canvasSize.w}
                height={canvasSize.h}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {/* Zone grid */}
              {(() => {
                const lines = [];
                for (let c = 1; c < cols; c++) {
                  lines.push(
                    <line key={`v${c}`}
                      x1={`${(c / cols) * 100}%`} y1="0"
                      x2={`${(c / cols) * 100}%`} y2="100%"
                      stroke="#b0b8c8" strokeWidth="1"
                    />
                  );
                }
                for (let r = 1; r < rows; r++) {
                  lines.push(
                    <line key={`h${r}`}
                      x1="0" y1={`${(r / rows) * 100}%`}
                      x2="100%" y2={`${(r / rows) * 100}%`}
                      stroke="#b0b8c8" strokeWidth="1"
                    />
                  );
                }
                const labels = [];
                for (let r = 0; r < rows; r++) {
                  for (let c = 0; c < cols; c++) {
                    const label = `${String.fromCharCode(65 + r)}${c + 1}`;
                    const cx = ((c + 0.5) / cols) * 100;
                    const cy = ((r + 0.5) / rows) * 100;
                    labels.push(
                      <g key={label}>
                        <text
                          x={`${cx}%`} y={`${cy}%`}
                          textAnchor="middle" dominantBaseline="middle"
                          fontSize="13" fontFamily="monospace" fontWeight="700"
                          fill="#64748b" opacity="0.35"
                        >
                          {label}
                        </text>
                        <text
                          x={`${cx}%`} y={`${cy}%`}
                          dy="16"
                          textAnchor="middle" dominantBaseline="middle"
                          fontSize="9" fontFamily="monospace" fontWeight="500"
                          fill="#64748b" opacity="0.28"
                        >
                          {zoneW}{dims.unit}×{zoneH}{dims.unit}
                        </text>
                      </g>
                    );
                  }
                }
                return <svg className="absolute inset-0 w-full h-full pointer-events-none">{lines}{labels}</svg>;
              })()}

              {/* Sensor markers */}
              {groupSensors.map(sensor => {
                const pos = positions[sensor.id];
                if (!pos) return null;
                const classification = classifySensor(sensor, allSensors);
                const isOffline  = sensor.status === 'offline';
                const isBreach   = sensor.status === 'warning';
                // Anomaly ring shown for any non-offline sensor with isolated_anomaly
                // Dot color: breach always red, anomaly-only → yellow, else from getSensorVisual
                const isAnomaly  = !isOffline && classification === 'isolated_anomaly';
                const v          = getSensorVisual(sensor);
                const dotColor   = isBreach ? '#ef4444' : isAnomaly ? '#f59e0b' : v.dot;
                const isTrend    = !isOffline && !isBreach && sensor.isTrendBreachRisk;

                return (
                  <div
                    key={sensor.id}
                    className="absolute z-10"
                    style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: 'translate(-50%,-50%)' }}
                    onMouseEnter={e => handleSensorHover(e, sensor)}
                    onMouseLeave={() => setHoveredSensor(null)}
                    onMouseDown={e => handleMouseDown(e, sensor.id)}
                    onClick={e => { if (!editMode) { e.stopPropagation(); onSensorClick(sensor.id); } }}
                  >
                    {/* Trend-risk: subtle pulsing amber ring to signal approaching limit */}
                    {isTrend && (
                      <div
                        className="absolute rounded-full pointer-events-none animate-pulse"
                        style={{
                          width: DOT + 8, height: DOT + 8, top: -4, left: -4,
                          background: 'rgba(245,158,11,0.18)',
                          border: '1.5px solid rgba(245,158,11,0.45)',
                        }}
                      />
                    )}
                    <div
                      className={`rounded-full border-2 border-white shadow-md transition-transform ${
                        editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:scale-125'
                      }`}
                      style={{
                        width: DOT, height: DOT,
                        background: dotColor,
                        boxShadow: `0 0 7px ${dotColor}aa`,
                      }}
                    />
                    {isAnomaly && (
                      <div
                        className="absolute rounded-full border-2 border-dashed pointer-events-none animate-pulse"
                        style={{
                          width: DOT + 10, height: DOT + 10, top: -5, left: -5,
                          // Red-tinted ring for breach+anomaly, amber for pure anomaly
                          borderColor: isBreach ? 'rgba(245,158,11,0.85)' : 'rgba(245,158,11,0.85)',
                          boxShadow: isBreach ? '0 0 0 1.5px rgba(239,68,68,0.25)' : 'none',
                        }}
                      />
                    )}
                    {editMode && (
                      <div className="absolute top-[18px] left-1/2 -translate-x-1/2 text-[9px] font-mono bg-white/95 px-1.5 py-0.5 rounded shadow whitespace-nowrap border border-outline-variant/40 z-20">
                        {sensor.id}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <Legend
          roomW={dims.width}
          roomH={dims.length}
          unit={dims.unit}
          useInterpolation={useInterpolation}
          cols={cols}
          rows={rows}
        />
      </div>

      {/* Hover card — fixed to viewport */}
      {hoveredSensor && !editMode && (
        <div
          className="fixed z-[200] pointer-events-none"
          style={{
            left: Math.min(hoverPos.x + 16, window.innerWidth  - 320),
            top:  Math.max(hoverPos.y - 20, 8),
          }}
        >
          <SensorHoverCard
            sensor={hoveredSensor}
            allSensors={allSensors}
            groupName={group.name}
          />
        </div>
      )}
    </div>
  );
};

export default FloorPlanView;
