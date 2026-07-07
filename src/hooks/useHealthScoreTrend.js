import { useHealthScore } from './useHealthScore';

export const useHealthScoreTrend = (selectedGroupId = 'all', daysCount = 90) => {
  const {
    healthScore,
    verifiedCompliancePct,
    coveragePct,
    severityClearance,
    loading
  } = useHealthScore(selectedGroupId);

  if (loading) {
    return { trendData: [], annotations: [], loading: true };
  }

  const trendData = [];
  const now = new Date();

  // Generate deterministic history over the selected number of days
  for (let i = daysCount - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    let score = healthScore;
    let compliance = verifiedCompliancePct;
    let coverage = coveragePct;
    let severity = severityClearance;

    if (i > 0) {
      // Simulate historical fluctuations based on days offset
      const wave = Math.sin((daysCount - i) / 5) * 3.5;
      const noise = Math.cos((daysCount - i) * 1.3) * 1.5;
      
      score = Math.max(0.0, Math.min(100.0, healthScore - (i * 0.05) + wave + noise));
      compliance = Math.max(0.0, Math.min(100.0, verifiedCompliancePct - (i * 0.04) + wave * 0.8 + noise * 0.9));
      coverage = Math.max(0.0, Math.min(100.0, coveragePct - (i * 0.02) + wave * 0.5 + noise * 0.4));
      severity = Math.max(0.0, Math.min(100.0, severityClearance - (i * 0.06) + wave * 1.2 + noise * 1.5));
    }

    trendData.push({
      date: dateStr,
      score: parseFloat(score.toFixed(1)),
      verifiedCompliancePct: parseFloat(compliance.toFixed(1)),
      coveragePct: parseFloat(coverage.toFixed(1)),
      severityClearance: parseFloat(severity.toFixed(1))
    });
  }

  // Predefined mock event annotations relative to group/room locations
  const allAnnotations = [
    { groupId: 'alert1', daysAgo: 14, type: 'excursion', label: 'Severe excursion in Cold Room 2 (ESI 279)' },
    { groupId: 'alert1', daysAgo: 40, type: 'excursion', label: 'Minor excursion in Cold Room 2 (ESI 16)' },
    { groupId: 'werrrsdsddf', daysAgo: 30, type: 'excursion', label: 'Minor spikes in Cold Room 1 (ESI 2.5)' },
    { groupId: 'co2sdasdf', daysAgo: 45, type: 'coverage', label: 'Coverage gap opened in Lab Area A' },
    { groupId: 'wewe', daysAgo: 60, type: 'coverage', label: 'Coverage gap opened in Cold Room 3' }
  ];

  // Filter annotations based on room scope and timeline constraints
  const activeAnnotations = allAnnotations
    .filter(ann => {
      // Must match selected room
      if (selectedGroupId !== 'all' && ann.groupId !== selectedGroupId) {
        return false;
      }
      // Must fit in active range
      return ann.daysAgo < daysCount;
    })
    .map(ann => {
      const dayIndex = daysCount - 1 - ann.daysAgo;
      const date = new Date(now.getTime() - ann.daysAgo * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      return {
        ...ann,
        dayIndex,
        dateStr
      };
    });

  return { trendData, annotations: activeAnnotations, loading: false };
};
