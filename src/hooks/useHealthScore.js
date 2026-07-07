import { useVerifiedCompliance } from './useVerifiedCompliance';
import { useTopExcursions } from './useTopExcursions';

// Tuning Constants - Flagged for compliance team sign-off
export const WEIGHTS = {
  verifiedCompliance: 0.4,
  coverage: 0.3,
  severity: 0.3
};

// Worst-case scenario ESI ceiling determined from the severe Cold Room 2 excursion (ALT-9921 has ESI 279)
export const CRITICAL_ESI_CEILING = 300.0;

export const useHealthScore = () => {
  const { facilityMetrics, loading: complianceLoading } = useVerifiedCompliance();
  const { excursions, loading: excursionsLoading } = useTopExcursions();

  const loading = complianceLoading || excursionsLoading;

  if (loading) {
    return { healthScore: null, loading: true };
  }

  const { verifiedCompliancePct, coveragePct } = facilityMetrics;

  // Sum of unacknowledged alerts' ESI score
  const totalSeverity = excursions
    .filter(e => e.state === 'unacknowledged')
    .reduce((acc, curr) => acc + (curr.esiScore || 0), 0);

  const normalizedSeverityPct = Math.min((totalSeverity / CRITICAL_ESI_CEILING) * 100, 100);

  const score = (WEIGHTS.verifiedCompliance * verifiedCompliancePct) +
                (WEIGHTS.coverage * coveragePct) +
                (WEIGHTS.severity * (100 - normalizedSeverityPct));

  return {
    healthScore: parseFloat(score.toFixed(1)),
    verifiedCompliancePct,
    coveragePct,
    totalSeverity,
    normalizedSeverityPct: parseFloat(normalizedSeverityPct.toFixed(1)),
    loading: false
  };
};
