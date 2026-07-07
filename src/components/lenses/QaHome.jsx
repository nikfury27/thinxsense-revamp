import React from 'react';
import ComplianceSummaryCard from '../widgets/ComplianceSummaryCard';
import SeverityRankingPanel from '../widgets/SeverityRankingPanel';

export const QaHome = ({ onNavigate }) => {
  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Quality Assurance Dashboard</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Compliance tracking, threshold violation verification, and quality sign-off management.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplianceSummaryCard />
        <SeverityRankingPanel onNavigate={onNavigate} />
      </div>
    </div>
  );
};

export default QaHome;
