// Heatmap Interpolation Engine using Inverse Distance Weighting (IDW)
// Supports bilinear scaling, custom confidence calculations, and incremental updates.

export const BREACH_THRESHOLD = 25.0;

/**
 * Classifies a sensor according to its temperature in relation to its neighbors.
 * Identifies isolated anomalies or room-wide excursions.
 */
export const classifySensor = (sensor, allSensors) => {
  if (sensor.status === 'offline') return 'normal';
  
  const neighbors = (allSensors || []).filter(
    s => s.group === sensor.group && s.id !== sensor.id && s.status !== 'offline'
  );
  
  if (neighbors.length === 0) return 'isolated';
  
  const avg = neighbors.reduce((a, s) => a + s.temp, 0) / neighbors.length;
  
  if (sensor.temp > BREACH_THRESHOLD && Math.abs(sensor.temp - avg) > 3.0) {
    return 'isolated_anomaly';
  }
  
  if (sensor.temp > BREACH_THRESHOLD) {
    return 'room_wide';
  }
  
  return 'normal';
};

/**
 * Resolves the sensorConfidence and neighbourConfidence values based on status and neighbour checks.
 * Confidence map:
 * - Healthy Sensor: 1.0
 * - Warning (approaching breach): 0.75
 * - Alert (breach): 1.0
 * - Isolated Anomaly: 0.25 (neighbourhood check)
 * - Offline: 0
 */
export const getSensorConfidences = (sensor, allSensors) => {
  if (sensor.status === 'offline') {
    return { sensorConfidence: 0.0, neighbourConfidence: 1.0 };
  }

  const classification = classifySensor(sensor, allSensors);

  let sensorConfidence = 1.0;
  let neighbourConfidence = 1.0;

  // 1. Resolve sensorConfidence
  if (sensor.status === 'warning' || sensor.temp > BREACH_THRESHOLD) {
    sensorConfidence = 1.0; // Alert
  } else if (sensor.isTrendBreachRisk) {
    sensorConfidence = 0.75; // Warning (Approaching limit)
  } else {
    sensorConfidence = 1.0; // Healthy / Normal
  }

  // 2. Resolve neighbourConfidence
  if (classification === 'isolated_anomaly') {
    neighbourConfidence = 0.25;
  }

  return { sensorConfidence, neighbourConfidence };
};

/**
 * Computes opacity decay matching the original canvas radial gradient stops:
 * - 0% to 30% distance: 0.38 to 0.22 opacity
 * - 30% to 60% distance: 0.22 to 0.10 opacity
 * - 60% to 85% distance: 0.10 to 0.04 opacity
 * - 85% to 100% distance: 0.04 to 0.0 opacity
 */
export const getOpacity = (d, radius) => {
  if (d >= radius) return 0;
  const ratio = d / radius;
  if (ratio <= 0.30) {
    const subRatio = ratio / 0.30;
    return 0.38 - subRatio * (0.38 - 0.22);
  } else if (ratio <= 0.60) {
    const subRatio = (ratio - 0.30) / 0.30;
    return 0.22 - subRatio * (0.22 - 0.10);
  } else if (ratio <= 0.85) {
    const subRatio = (ratio - 0.60) / 0.25;
    return 0.10 - subRatio * (0.10 - 0.04);
  } else {
    const subRatio = (ratio - 0.85) / 0.15;
    return 0.04 - subRatio * 0.04;
  }
};

/**
 * Resolves the color vector [R, G, B] based on the sensor status (stable/green vs excursion/red).
 */
export const getSensorColor = (sensor) => {
  const isBreach = sensor.status === 'warning' || sensor.temp > BREACH_THRESHOLD;
  return isBreach ? [239, 68, 68] : [16, 185, 129];
};

/**
 * Finds the color of the closest sensor to a physical location.
 */
const getNearestSensorColor = (px, py, sensors, positions, roomW, roomH) => {
  let minDistance = Infinity;
  let nearestColor = [16, 185, 129];

  for (const s of sensors) {
    if (!positions[s.id]) continue;
    const sx = positions[s.id].x * roomW;
    const sy = positions[s.id].y * roomH;
    const dx = px - sx;
    const dy = py - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < minDistance) {
      minDistance = dist;
      nearestColor = getSensorColor(s);
    }
  }

  return nearestColor;
};

/**
 * Performs Inverse Distance Weighting (IDW) to interpolate status values and opacity for all grid cells,
 * then blends pure red (excursions) over pure green (stable) using alpha compositing.
 * Supports incremental updating if a single sensor moved/changed.
 */
export const calculateGridIDW = ({
  roomW,
  roomH,
  cols,
  rows,
  sensors,
  positions,
  allSensors,
  influenceRadius,
  prevGridData = null,
  changedSensorId = null,
  prevSensorPos = null
}) => {
  const data = new Array(cols * rows);
  const isIncremental = prevGridData && changedSensorId && prevSensorPos;
  const placedSensors = sensors.filter(s => positions[s.id] && s.status !== 'offline');

  const greenColor = [16, 185, 129];
  const redColor = [239, 68, 68];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const px = ((c + 0.5) / cols) * roomW;
      const py = ((r + 0.5) / rows) * roomH;

      // Incremental optimization: skip cells outside the influence of the modified sensor (old + new bounds)
      if (isIncremental) {
        const sxNew = positions[changedSensorId] ? positions[changedSensorId].x * roomW : null;
        const syNew = positions[changedSensorId] ? positions[changedSensorId].y * roomH : null;
        const sxOld = prevSensorPos.x * roomW;
        const syOld = prevSensorPos.y * roomH;

        let inNewRadius = false;
        if (sxNew !== null && syNew !== null) {
          const dxNew = px - sxNew;
          const dyNew = py - syNew;
          if (dxNew * dxNew + dyNew * dyNew <= influenceRadius * influenceRadius) {
            inNewRadius = true;
          }
        }

        let inOldRadius = false;
        const dxOld = px - sxOld;
        const dyOld = py - syOld;
        if (dxOld * dxOld + dyOld * dyOld <= influenceRadius * influenceRadius) {
          inOldRadius = true;
        }

        if (!inNewRadius && !inOldRadius) {
          data[idx] = prevGridData[idx];
          continue;
        }
      }

      // Compute nearest distances to any Red (excursion) and Green (stable) sensors
      let dRedMin = Infinity;
      let dGreenMin = Infinity;

      for (const s of placedSensors) {
        const sx = positions[s.id].x * roomW;
        const sy = positions[s.id].y * roomH;
        const dx = px - sx;
        const dy = py - sy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const isBreach = s.status === 'warning' || s.temp > BREACH_THRESHOLD;
        if (isBreach) {
          if (dist < dRedMin) dRedMin = dist;
        } else {
          if (dist < dGreenMin) dGreenMin = dist;
        }
      }

      let opRed = 0;
      let opGreen = 0;

      for (const s of placedSensors) {
        const sx = positions[s.id].x * roomW;
        const sy = positions[s.id].y * roomH;
        const dx = px - sx;
        const dy = py - sy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const isBreach = s.status === 'warning' || s.temp > BREACH_THRESHOLD;

        if (dist <= influenceRadius) {
          const { sensorConfidence, neighbourConfidence } = getSensorConfidences(s, allSensors);
          const conf = sensorConfidence * neighbourConfidence;

          // Apply directional boundary suppression to prevent distant stable sensors
          // from washing out the gradient in zones that have no stable neighbors.
          // Using power 3.0 for sharper boundary definition.
          let sFactor = 1.0;
          if (isBreach) {
            if (dGreenMin < dRedMin && dRedMin > 0) {
              sFactor = Math.pow(dGreenMin / dRedMin, 3.0);
            }
          } else {
            if (dRedMin < dGreenMin && dGreenMin > 0) {
              sFactor = Math.pow(dRedMin / dGreenMin, 3.0);
            }
          }

          const effectiveConf = conf * sFactor;
          const op = getOpacity(dist, influenceRadius) * effectiveConf;
          
          if (isBreach) {
            if (op > opRed) opRed = op;
          } else {
            if (op > opGreen) opGreen = op;
          }
        }
      }

      // Compositing formula: Red over Green
      const aOut = opRed + opGreen * (1 - opRed);
      let color;
      let opacity;

      if (aOut > 0) {
        const rVal = Math.round((redColor[0] * opRed + greenColor[0] * opGreen * (1 - opRed)) / aOut);
        const gVal = Math.round((redColor[1] * opRed + greenColor[1] * opGreen * (1 - opRed)) / aOut);
        const bVal = Math.round((redColor[2] * opRed + greenColor[2] * opGreen * (1 - opRed)) / aOut);
        color = [rVal, gVal, bVal];
        opacity = aOut;
      } else {
        color = getNearestSensorColor(px, py, placedSensors, positions, roomW, roomH);
        opacity = 0;
      }

      data[idx] = { color, opacity };
    }
  }

  return data;
};
