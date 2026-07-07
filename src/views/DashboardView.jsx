import React from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import OpsHome from '../components/lenses/OpsHome';
import QaHome from '../components/lenses/QaHome';
import ExecHome from '../components/lenses/ExecHome';

const DashboardView = ({ onNavigate }) => {
  const { lens } = useCurrentUser();

  if (lens === 'ops') {
    return <OpsHome onNavigate={onNavigate} />;
  }
  if (lens === 'qa') {
    return <QaHome onNavigate={onNavigate} />;
  }
  return <ExecHome />;
};

export default DashboardView;
