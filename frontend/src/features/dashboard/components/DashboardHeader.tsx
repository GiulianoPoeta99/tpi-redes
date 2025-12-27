import { Clock, Folder, Network } from 'lucide-react';
import type React from 'react';
import HeaderActionButton from '../../shared/components/HeaderActionButton';
import IpDisplay from '../../shared/components/IpDisplay';
import ModeSelector from '../../shared/components/ModeSelector';

interface DashboardHeaderProps {
  mode: 'receiver' | 'transmitter' | 'mitm';
  onModeChange: (mode: 'receiver' | 'transmitter' | 'mitm') => void;
  isBusy: boolean;
  onShowFiles: () => void;
  onShowHistory: () => void;
  headerContent: React.ReactNode;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  mode,
  onModeChange,
  isBusy,
  onShowFiles,
  onShowHistory,
  headerContent,
}) => {
  return (
    <header className="bg-white/5 border-b border-white/10 backdrop-blur-md p-4 flex items-center justify-between z-10 sticky top-0">
      {/* Left: Brand & Modes */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3 group cursor-default">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
            <Network className="text-white" size={24} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-white leading-tight tracking-tight group-hover:text-blue-200 transition-colors">
              TPI Redes
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold group-hover:text-gray-300 transition-colors">
              Network Manager
            </span>
          </div>
        </div>

        {/* Segmented Control */}
        <ModeSelector currentMode={mode} onModeChange={onModeChange} isBusy={isBusy} />

        <div className="w-px h-8 bg-white/10" />

        <div className="flex items-center gap-3">
          <HeaderActionButton label="Files" icon={Folder} color="blue" onClick={onShowFiles} />

          <HeaderActionButton label="History" icon={Clock} color="purple" onClick={onShowHistory} />
        </div>
      </div>

      {/* Right: Header Content & Actions */}
      <div className="flex items-stretch gap-4">
        <IpDisplay variant="gray" className="h-full" />
        {headerContent}
      </div>
    </header>
  );
};

export default DashboardHeader;
