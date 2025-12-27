import type React from 'react';

type Mode = 'receiver' | 'transmitter' | 'mitm';

interface ModeSelectorProps {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
  isBusy: boolean;
  className?: string; // Allow passing external styles if needed for positioning
}

const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onModeChange,
  isBusy,
  className = '',
}) => {
  const modes: Mode[] = ['receiver', 'transmitter', 'mitm'];

  return (
    <div className={`flex bg-black/20 border border-white/5 rounded-lg p-1 ${className}`}>
      {modes.map((m) => {
        const isActive = currentMode === m;
        let activeClass = '';
        if (isActive) {
          if (m === 'receiver') activeClass = 'bg-mode-rx text-white shadow-lg shadow-mode-rx/20';
          else if (m === 'transmitter')
            activeClass = 'bg-mode-tx text-white shadow-lg shadow-mode-tx/20';
          else if (m === 'mitm')
            activeClass = 'bg-mode-mitm text-white shadow-lg shadow-mode-mitm/20';
        }

        return (
          <button
            type="button"
            key={m}
            disabled={isBusy}
            onClick={() => onModeChange(m)}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all duration-300 ${
              isActive
                ? activeClass
                : isBusy
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
            {isBusy && currentMode === m && <span className="ml-2 text-xs">🔒</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ModeSelector;
