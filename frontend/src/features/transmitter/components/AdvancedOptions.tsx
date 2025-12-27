import { Settings } from 'lucide-react';
import type React from 'react';
import ConfigGroup from '../../shared/components/ConfigGroup';
import ChunkSizeConfig from './ChunkSizeConfig';
import DelayConfig from './DelayConfig';

interface AdvancedOptionsProps {
  delay: number;
  setDelay: (delay: number) => void;
  status: 'idle' | 'sending' | 'success' | 'error';
  chunkSize: number;
  setChunkSize: (size: number) => void;
}

const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
  delay,
  setDelay,
  status,
  chunkSize,
  setChunkSize,
}) => {
  return (
    <ConfigGroup title="Advanced Options" icon={Settings} className="h-full">
      <div className="flex flex-col gap-4 h-full">
        <DelayConfig value={delay} onChange={setDelay} disabled={status !== 'idle'} />

        <ChunkSizeConfig value={chunkSize} onChange={setChunkSize} disabled={status !== 'idle'} />
      </div>
    </ConfigGroup>
  );
};

export default AdvancedOptions;
