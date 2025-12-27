import type React from 'react';
import ControlContainer from '../../shared/components/ControlContainer';

interface MitmStatsConfigProps {
  stats: {
    intercepted: number;
    corrupted: number;
  };
  isActive: boolean;
  className?: string;
}

const MitmStatsConfig: React.FC<MitmStatsConfigProps> = ({
  stats,
  isActive: _isActive,
  className = '',
}) => {
  const titleNode = (
    <div className="w-full flex-1 flex justify-between items-center">
      <span>Operational Mode</span>
      <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
        DATA CORRUPTION ONLY
      </span>
    </div>
  );

  return (
    <ControlContainer title={titleNode} className={className}>
      <div className="flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-2 gap-4 items-center w-full">
          <div className="flex flex-col items-center justify-center">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
              Intercepted
            </span>
            <span className="text-3xl font-mono text-green-500 tracking-tight">
              {stats.intercepted.toLocaleString().padStart(5, '0')}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center border-l border-gray-700/50">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
              Corrupted
            </span>
            <span
              className={`text-3xl font-mono tracking-tight ${
                stats.corrupted > 0 ? 'text-red-500' : 'text-gray-600'
              }`}
            >
              {stats.corrupted.toLocaleString().padStart(5, '0')}
            </span>
          </div>
        </div>
      </div>
    </ControlContainer>
  );
};

export default MitmStatsConfig;
