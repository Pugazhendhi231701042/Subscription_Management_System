import React from 'react';

interface StatusbarPipelineProps {
  stages: string[];
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  canChangeStatus?: boolean;
}

export const StatusbarPipeline: React.FC<StatusbarPipelineProps> = ({
  stages,
  currentStatus,
  onStatusChange,
  canChangeStatus = false
}) => {
  const currentIndex = stages.findIndex(
    s => s.toUpperCase() === currentStatus.toUpperCase()
  );

  return (
    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm text-xs font-semibold">
      {stages.map((stage, idx) => {
        const isCurrent = stage.toUpperCase() === currentStatus.toUpperCase();
        const isPassed = currentIndex > -1 && idx < currentIndex;

        let bgClass = 'bg-slate-50 text-slate-500 hover:bg-slate-100';
        if (isCurrent) {
          bgClass = 'bg-[#714B67] text-white font-bold shadow-inner';
        } else if (isPassed) {
          bgClass = 'bg-emerald-50 text-emerald-700 font-medium';
        }

        return (
          <button
            key={stage}
            disabled={!canChangeStatus}
            onClick={() => onStatusChange && onStatusChange(stage)}
            className={`px-3 py-1.5 flex items-center space-x-1.5 border-r border-slate-200 last:border-r-0 transition-colors ${bgClass} ${
              canChangeStatus ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            {isPassed && <span className="text-[10px]">✓</span>}
            <span>{stage}</span>
          </button>
        );
      })}
    </div>
  );
};
