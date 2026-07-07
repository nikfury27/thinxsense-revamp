import React from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';

export const LensSwitcher = () => {
  const { lens, changeLens } = useCurrentUser();

  const lenses = [
    { id: 'ops', label: 'Ops', icon: 'engineering' },
    { id: 'qa', label: 'QA', icon: 'fact_check' },
    { id: 'exec', label: 'Exec', icon: 'insights' }
  ];

  return (
    <div className="flex flex-col lg:flex-row bg-white/10 rounded-lg p-0.5 border border-white/10 select-none overflow-hidden w-full mt-2 gap-1 lg:gap-0">
      {lenses.map(item => {
        const isActive = lens === item.id;
        return (
          <button
            key={item.id}
            onClick={() => changeLens(item.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all text-xs font-semibold ${
              isActive 
                ? 'bg-white text-primary shadow-sm font-bold scale-[1.02]' 
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
            title={`${item.label} Lens`}
          >
            <span className="material-symbols-outlined text-[16px] shrink-0">
              {item.icon}
            </span>
            <span className="hidden lg:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default LensSwitcher;
