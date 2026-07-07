import { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

// Tuning Constants - Flagged for compliance team sign-off
export const WEIGHTS = {
  verifiedCompliance: 0.4,
  coverage: 0.3,
  severity: 0.3
};

// Genuinely bad excursion ceilings (to normalize ESI)
export const TEMP_ESI_CEILING = 300.0;
export const HUM_ESI_CEILING = 100.0;

export const useHealthScore = (selectedGroupId = 'all') => {
  const [data, setData] = useState({
    healthScore: 100.0,
    verifiedCompliancePct: 100.0,
    rawCompliance: 100.0,
    coveragePct: 100.0,
    totalSeverity: 0.0,
    severityClearance: 100.0,
    tempSeverityClearance: 100.0,
    humSeverityClearance: 100.0,
    roomScores: [],
    loading: true
  });

  useEffect(() => {
    let active = true;
    const fetchAndCalculate = async () => {
      try {
        const [groups, sensors, alertsRes] = await Promise.all([
          apiService.getGroups(),
          apiService.getSensors(),
          apiService.getAlerts({ state: 'unacknowledged' })
        ]);

        if (!active) return;

        // Calculate metrics for each room/group
        const roomScores = groups.map(g => {
          const groupSensors = sensors.filter(s => s.group === g.name);
          
          // 1. Coverage
          let coverageVal = 100.0;
          if (groupSensors.length > 0) {
            const online = groupSensors.filter(s => s.status !== 'offline').length;
            coverageVal = (online / groupSensors.length) * 100;
          }
          const coveragePct = parseFloat(coverageVal.toFixed(1));

          // 2. Raw Compliance
          let rawComplianceVal = 100.0;
          if (groupSensors.length > 0) {
            const complianceSum = groupSensors.reduce((acc, s) => acc + (s.complianceScore || 0), 0);
            rawComplianceVal = complianceSum / groupSensors.length;
          }
          const rawCompliance = parseFloat(rawComplianceVal.toFixed(1));

          // 3. Verified Compliance = Coverage * Raw Compliance
          const verifiedCompliancePct = parseFloat(((coveragePct / 100) * rawCompliance).toFixed(1));

          // 4. ESI and Severity Clearance
          const groupSensorsIds = groupSensors.map(s => s.id);
          const groupAlerts = alertsRes.filter(a => groupSensorsIds.includes(a.sensor));

          const tempAlerts = groupAlerts.filter(a => a.param === 'Temperature');
          const humAlerts = groupAlerts.filter(a => a.param === 'Humidity');

          const roomTempESI = tempAlerts.reduce((acc, a) => {
            const deviation = a.deviation || 0;
            const duration = a.duration || 0;
            const esi = parseFloat((deviation * duration).toFixed(1));
            return acc + esi;
          }, 0.0);

          const roomHumESI = humAlerts.reduce((acc, a) => {
            const deviation = a.deviation || 0;
            const duration = a.duration || 0;
            const esi = parseFloat((deviation * (duration / 10)).toFixed(1));
            return acc + esi;
          }, 0.0);

          const tempSeverityClearance = 100.0 * (1.0 - Math.min(1.0, roomTempESI / TEMP_ESI_CEILING));
          const humSeverityClearance = 100.0 * (1.0 - Math.min(1.0, roomHumESI / HUM_ESI_CEILING));
          
          // Equal-weighted average of temp and humidity severity clearances
          const severityClearance = parseFloat(((tempSeverityClearance + humSeverityClearance) / 2).toFixed(1));

          // 5. Room Health Score
          const roomHealthScoreVal = (WEIGHTS.verifiedCompliance * verifiedCompliancePct) +
                                    (WEIGHTS.coverage * coveragePct) +
                                    (WEIGHTS.severity * severityClearance);
                                    
          // Clamp score defensively to [0.0, 100.0]
          const roomHealthScore = parseFloat(Math.max(0.0, Math.min(100.0, roomHealthScoreVal)).toFixed(1));

          return {
            groupId: g.name,
            roomName: g.location || g.name,
            healthScore: roomHealthScore,
            verifiedCompliancePct,
            rawCompliance,
            coveragePct,
            severityClearance,
            tempSeverityClearance: parseFloat(tempSeverityClearance.toFixed(1)),
            humSeverityClearance: parseFloat(humSeverityClearance.toFixed(1)),
            totalSeverity: parseFloat((roomTempESI + roomHumESI).toFixed(1))
          };
        });

        // Resolve active scoped parameters based on selectedGroupId
        let resolvedScore = 100.0;
        let resolvedVerifiedCompliance = 100.0;
        let resolvedRawCompliance = 100.0;
        let resolvedCoverage = 100.0;
        let resolvedTotalSeverity = 0.0;
        let resolvedSeverityClearance = 100.0;
        let resolvedTempClearance = 100.0;
        let resolvedHumClearance = 100.0;

        if (selectedGroupId === 'all' || !selectedGroupId) {
          // Facility-wide rollup is the average of room health scores
          if (roomScores.length > 0) {
            resolvedScore = roomScores.reduce((acc, r) => acc + r.healthScore, 0.0) / roomScores.length;
            resolvedVerifiedCompliance = roomScores.reduce((acc, r) => acc + r.verifiedCompliancePct, 0.0) / roomScores.length;
            resolvedRawCompliance = roomScores.reduce((acc, r) => acc + r.rawCompliance, 0.0) / roomScores.length;
            resolvedCoverage = roomScores.reduce((acc, r) => acc + r.coveragePct, 0.0) / roomScores.length;
            resolvedTotalSeverity = roomScores.reduce((acc, r) => acc + r.totalSeverity, 0.0);
            resolvedSeverityClearance = roomScores.reduce((acc, r) => acc + r.severityClearance, 0.0) / roomScores.length;
            resolvedTempClearance = roomScores.reduce((acc, r) => acc + r.tempSeverityClearance, 0.0) / roomScores.length;
            resolvedHumClearance = roomScores.reduce((acc, r) => acc + r.humSeverityClearance, 0.0) / roomScores.length;
          }
        } else {
          // Scoped to single room
          const match = roomScores.find(r => r.groupId === selectedGroupId);
          if (match) {
            resolvedScore = match.healthScore;
            resolvedVerifiedCompliance = match.verifiedCompliancePct;
            resolvedRawCompliance = match.rawCompliance;
            resolvedCoverage = match.coveragePct;
            resolvedTotalSeverity = match.totalSeverity;
            resolvedSeverityClearance = match.severityClearance;
            resolvedTempClearance = match.tempSeverityClearance;
            resolvedHumClearance = match.humSeverityClearance;
          }
        }

        setData({
          healthScore: parseFloat(Math.max(0.0, Math.min(100.0, resolvedScore)).toFixed(1)),
          verifiedCompliancePct: parseFloat(resolvedVerifiedCompliance.toFixed(1)),
          rawCompliance: parseFloat(resolvedRawCompliance.toFixed(1)),
          coveragePct: parseFloat(resolvedCoverage.toFixed(1)),
          totalSeverity: parseFloat(resolvedTotalSeverity.toFixed(1)),
          severityClearance: parseFloat(resolvedSeverityClearance.toFixed(1)),
          tempSeverityClearance: parseFloat(resolvedTempClearance.toFixed(1)),
          humSeverityClearance: parseFloat(resolvedHumClearance.toFixed(1)),
          roomScores: roomScores.sort((a, b) => a.healthScore - b.healthScore), // sorted worst-first
          loading: false
        });
      } catch (err) {
        console.error('Error calculating health score', err);
      }
    };

    fetchAndCalculate();
    return () => {
      active = false;
    };
  }, [selectedGroupId]);

  return data;
};
