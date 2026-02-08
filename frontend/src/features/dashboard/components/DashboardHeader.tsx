import { Clock, Folder, Network } from 'lucide-react';
import type React from 'react';
import HeaderActionButton from '../../shared/components/HeaderActionButton';
import IpDisplay from '../../shared/components/IpDisplay';
import ModeSelector from '../../shared/components/ModeSelector';

/**
 * Props for the DashboardHeader component.
 *
 * @property mode - Current active mode.
 * @property onModeChange - Callback to change the active mode.
 * @property isBusy - Whether the dashboard is performing a blocking operation.
 * @property onShowFiles - Callback to show the files modal.
 * @property onShowHistory - Callback to show the history modal.
 * @property headerContent - Additional content to render in the header.
 */
interface DashboardHeaderProps {
  mode: 'receiver' | 'transmitter' | 'mitm';
  onModeChange: (mode: 'receiver' | 'transmitter' | 'mitm') => void;
  isBusy: boolean;
  onShowFiles: () => void;
  onShowHistory: () => void;
  headerContent: React.ReactNode;
}

/**
 * The top navigation bar containing branding, mode selection, and global actions.
 */
const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  mode,
  onModeChange,
  isBusy,
  onShowFiles,
  onShowHistory,
  headerContent,
}) => {
  return (
    <header className="bg-white/5 border-b border-white/10 backdrop-blur-md p-3 sm:p-4 z-10 sticky top-0">
      <div className="flex flex-wrap items-start 2xl:items-center gap-3 sm:gap-4 2xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:gap-4 lg:gap-6">
          <div className="flex items-center gap-2 sm:gap-3 group cursor-default shrink-0">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
              <Network className="text-white" size={24} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight tracking-tight group-hover:text-blue-200 transition-colors">
                TPI Redes
              </h1>
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold group-hover:text-gray-300 transition-colors">
                Network Manager
              </span>
            </div>
          </div>

          <ModeSelector
            currentMode={mode}
            onModeChange={onModeChange}
            isBusy={isBusy}
            className="order-3 w-full xl:order-none xl:w-auto"
          />

          <div className="hidden lg:block w-px h-8 bg-white/10" />

          <div className="flex items-center gap-2 sm:gap-3">
            <HeaderActionButton label="Files" icon={Folder} color="blue" onClick={onShowFiles} />

            <HeaderActionButton
              label="History"
              icon={Clock}
              color="purple"
              onClick={onShowHistory}
            />
          </div>
        </div>

        <div className="flex w-full 2xl:w-auto flex-col lg:flex-row items-stretch gap-3 sm:gap-4 min-w-0">
          <IpDisplay variant="gray" size="sm" className="h-full w-full lg:w-auto" />
          <div className="w-full min-w-0">{headerContent}</div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
