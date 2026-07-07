import React from 'react';
import HealthScoreCard from '../widgets/HealthScoreCard';
import TrendChart from '../widgets/TrendChart';

export const ExecHome = () => {
  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Executive Overview</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          High-level rolled-up facility status and performance trends.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <HealthScoreCard />
        </div>
        <div className="lg:col-span-7">
          <TrendChart />
        </div>
      </div>
    </div>
  );
};

export default ExecHome;
