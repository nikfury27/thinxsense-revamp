import React from 'react';
import GatewayHealthList from '../widgets/GatewayHealthList';
import SensorHealthList from '../widgets/SensorHealthList';
import ActionQueue from '../widgets/ActionQueue';

export const OpsHome = ({ onNavigate }) => {
  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Operations Dashboard</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Real-time status tracking for facility, gateway, and sensor maintenance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GatewayHealthList onNavigate={onNavigate} />
        <SensorHealthList onNavigate={onNavigate} />
      </div>

      <div className="w-full">
        <ActionQueue onNavigate={onNavigate} />
      </div>
    </div>
  );
};

export default OpsHome;
