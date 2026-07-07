/**
 * Computes the Excursion Severity Index (ESI) of an alert. 
 * Supports both time-varying (climbing) temperature/humidity profiles and flat profiles.
 * 
 * @param {Object} alert - The alert object to calculate ESI for
 * @param {number} threshold - The safety threshold limit (e.g. 25.0 or 8.0)
 * @returns {number} The calculated ESI score
 */
export const calculateAlertESI = (alert, threshold = 25.0) => {
  if (!alert || (alert.param !== 'Temperature' && alert.param !== 'Humidity')) {
    return 0;
  }

  // Scaling factor: humidity ESI is traditionally scaled by 0.1 compared to temperature ESI
  const scaleFactor = alert.param === 'Humidity' ? 0.1 : 1.0;

  // Case A: If time-series logs are available, use Trapezoidal Rule integration (AUC)
  if (alert.logs && alert.logs.length >= 2) {
    let totalArea = 0;

    for (let i = 0; i < alert.logs.length - 1; i++) {
      const p1 = alert.logs[i];
      const p2 = alert.logs[i + 1];

      // Calculate deviation above threshold for both points (clamped to 0)
      const dev1 = Math.max(0, p1.value - threshold);
      const dev2 = Math.max(0, p2.value - threshold);

      // Duration between points in minutes
      const durationMin = (new Date(p2.time) - new Date(p1.time)) / (1000 * 60);

      // Trapezoid Area = Average Deviation * Interval Duration
      const segmentArea = ((dev1 + dev2) / 2) * durationMin;
      totalArea += segmentArea;
    }

    return parseFloat((totalArea * scaleFactor).toFixed(1));
  }

  // Case B: Fallback to flat calculation if time-series logs are not present
  if (alert.deviation && alert.duration) {
    return parseFloat((alert.deviation * alert.duration * scaleFactor).toFixed(1));
  }

  return 0;
};
