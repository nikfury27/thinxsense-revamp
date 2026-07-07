import { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

export const useVerifiedCompliance = () => {
  const [groupMetrics, setGroupMetrics] = useState([]);
  const [facilityMetrics, setFacilityMetrics] = useState({ verifiedCompliancePct: 100, coveragePct: 100 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [groups, sensors] = await Promise.all([
          apiService.getGroups(),
          apiService.getSensors()
        ]);

        const metrics = groups.map(g => {
          const groupSensors = sensors.filter(s => s.group === g.name);
          if (groupSensors.length === 0) {
            return {
              groupName: g.name,
              location: g.location,
              rawCompliance: 100,
              coveragePct: 100,
              verifiedCompliancePct: 100
            };
          }
          
          const total = groupSensors.length;
          const online = groupSensors.filter(s => s.status !== 'offline').length;
          const coverage = parseFloat(((online / total) * 100).toFixed(1));
          const rawComplianceSum = groupSensors.reduce((acc, s) => acc + (s.complianceScore || 0), 0);
          const rawCompliance = parseFloat((rawComplianceSum / total).toFixed(1));
          
          // Formula: coverage × raw compliance
          const verifiedCompliance = parseFloat(((coverage / 100) * rawCompliance).toFixed(1));

          return {
            groupName: g.name,
            location: g.location,
            rawCompliance,
            coveragePct: coverage,
            verifiedCompliancePct: verifiedCompliance
          };
        });

        setGroupMetrics(metrics);

        // Compute overall facility average
        if (metrics.length > 0) {
          const avgCompliance = metrics.reduce((acc, m) => acc + m.verifiedCompliancePct, 0) / metrics.length;
          const avgCoverage = metrics.reduce((acc, m) => acc + m.coveragePct, 0) / metrics.length;
          setFacilityMetrics({
            verifiedCompliancePct: parseFloat(avgCompliance.toFixed(1)),
            coveragePct: parseFloat(avgCoverage.toFixed(1))
          });
        } else {
          setFacilityMetrics({ verifiedCompliancePct: 100, coveragePct: 100 });
        }
      } catch (err) {
        console.error('Failed to load verified compliance', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { groupMetrics, facilityMetrics, loading };
};
