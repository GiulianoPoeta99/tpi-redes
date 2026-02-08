import type React from 'react';

type Mode = 'receiver' | 'transmitter' | 'mitm';

/**
 * Props for ModeSelector.
 *
 * @property currentMode - The currently active mode.
 * @property onModeChange - Callback when a mode is selected.
 * @property isBusy - Whether the mode switching is disabled due to active processes.
 * @property className - Optional additional CSS classes.
 */
interface ModeSelectorProps {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
  isBusy: boolean;
  className?: string;
}

/**
 * Component to switch between application modes (Receiver, Transmitter, MITM).
 */
const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onModeChange,
  isBusy,
  className = '',
}) => {
  const modes: Mode[] = ['receiver', 'transmitter', 'mitm'];
  const labels: Record<Mode, { full: string; short: string }> = {
    receiver: { full: 'Receiver', short: 'RX' },
    transmitter: { full: 'Transmitter', short: 'TX' },
    mitm: { full: 'MITM', short: 'MITM' },
  };

  return (
    <div
      className={`grid grid-cols-3 w-full xl:w-auto bg-black/20 border border-white/5 rounded-lg p-1 gap-1 ${className}`}
    >
      {modes.map((m) => {
        const isActive = currentMode === m;
        let activeClass = '';
        if (isActive) {
          if (m === 'receiver')
            activeClass = 'bg-purple-600 text-white shadow-lg shadow-purple-600/20';
          else if (m === 'transmitter')
            activeClass = 'bg-blue-600 text-white shadow-lg shadow-blue-600/20';
          else if (m === 'mitm') activeClass = 'bg-red-600 text-white shadow-lg shadow-red-600/20';
        }

        return (
          <button
            type="button"
            key={m}
            disabled={isBusy}
            onClick={() => onModeChange(m)}
            title={labels[m].full}
            className={`min-w-0 px-2 sm:px-3 lg:px-4 xl:px-6 py-2 rounded-md text-[11px] sm:text-xs xl:text-sm font-bold transition-all duration-300 overflow-hidden flex items-center justify-center gap-1.5 ${
              isActive
                ? activeClass
                : isBusy
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="truncate hidden sm:inline">{labels[m].full}</span>
            <span className="truncate sm:hidden">{labels[m].short}</span>
            {isBusy && currentMode === m && (
              <span className="hidden lg:inline text-[10px]">🔒</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ModeSelector;
