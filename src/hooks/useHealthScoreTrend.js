import { useHealthScore } from './useHealthScore';

export const useHealthScoreTrend = (daysCount = 90) => {
  const { healthScore, loading } = useHealthScore();

  if (loading) {
    return { trendData: [], loading: true };
  }

  // Generate deterministic history over the last 90 days.
  // Day 90 (today) matches the current calculated live healthScore.
  const trendData = [];
  const now = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    let dailyScore = healthScore;
    if (i > 0) {
      // Simulate historical fluctuations: wave + noise
      const wave = Math.sin((daysCount - i) / 5) * 3.5;
      const noise = (Math.cos((daysCount - i) * 1.3) * 1.5);
      dailyScore = Math.max(0, Math.min(100, healthScore - (i * 0.05) + wave + noise));
    }

    trendData.push({
      date: dateStr,
      score: parseFloat(dailyScore.toFixed(1))
    });
  }

  return { trendData, loading: false };
};
