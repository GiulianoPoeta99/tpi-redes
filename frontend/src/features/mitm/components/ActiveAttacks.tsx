import { PlayCircle, ShieldAlert, StopCircle } from 'lucide-react';
import type React from 'react';
import ConfigGroup from '../../shared/components/ConfigGroup';
import SubmitButton from '../../shared/components/SubmitButton';
import CorruptionSlider from './CorruptionSlider';
import MitmStatsConfig from './MitmStatsConfig';

interface MitmConfig {
  listenPort: number | string;
  targetIp: string;
  targetPort: number | string;
  corruption: number;
}

interface MitmStats {
  intercepted: number;
  corrupted: number;
}

interface ActiveAttacksProps {
  config: MitmConfig;
  setConfig: (config: MitmConfig) => void;
  isRunning: boolean;
  stats: MitmStats;
  toggleMitm: () => void;
}

const ActiveAttacks: React.FC<ActiveAttacksProps> = ({
  config,
  setConfig,
  isRunning,
  stats,
  toggleMitm,
}) => {
  return (
    <ConfigGroup title="Active Attacks" icon={ShieldAlert} className="flex-1 flex flex-col">
      <div className="flex flex-col h-full gap-4">
        {/* Slider & Presets Section */}
        <CorruptionSlider
          value={config.corruption}
          onChange={(val) => setConfig({ ...config, corruption: val })}
          disabled={isRunning}
        />

        {/* Stats & Mode Info */}
        <MitmStatsConfig stats={stats} isActive={isRunning} className="flex-1 min-h-0" />

        <SubmitButton
          onClick={toggleMitm}
          variant={isRunning ? 'danger' : 'primary'}
          className={`text-white ${
            isRunning
              ? 'bg-red-600 hover:bg-red-500 ring-red-500 shadow-red-900/20'
              : 'bg-blue-600 hover:bg-blue-500 ring-blue-500 shadow-blue-900/20'
          }`}
          icon={isRunning ? <StopCircle size={24} /> : <PlayCircle size={24} />}
        >
          {isRunning ? 'STOP PROXY' : 'START PROXY'}
        </SubmitButton>
      </div>
    </ConfigGroup>
  );
};

export default ActiveAttacks;
