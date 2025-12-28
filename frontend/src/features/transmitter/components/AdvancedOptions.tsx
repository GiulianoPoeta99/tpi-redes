import { Settings } from 'lucide-react';
import type React from 'react';
import ConfigGroup from '../../shared/components/ConfigGroup';
import ChunkSizeConfig from './ChunkSizeConfig';
import DelayConfig from './DelayConfig';

/**
 * Props for the AdvancedOptions component.
 */
interface AdvancedOptionsProps {
  /**
   * Transmission delay in milliseconds.
   */
  delay: number;
  /**
   * Callback to update delay.
   */
  setDelay: (delay: number) => void;
  /**
   * Current transmission status.
   */
  status: 'idle' | 'sending' | 'success' | 'error';
  /**
   * Size of data chunks in bytes.
   */
  chunkSize: number;
  /**
   * Callback to update chunk size.
   */
  setChunkSize: (size: number) => void;
}

/**
 * A container component for advanced transmission settings like delay and chunk size.
 */
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
