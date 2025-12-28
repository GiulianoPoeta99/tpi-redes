import type React from 'react';
import ControlContainer from '../../shared/components/ControlContainer';
import ChunkSizeSelector from './ChunkSizeSelector';

/**
 * Props for the ChunkSizeConfig component.
 */
interface ChunkSizeConfigProps {
  /**
   * Current chunk size in bytes.
   */
  value: number;
  /**
   * Callback to update chunk size.
   */
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * A configuration control for selecting the data chunk size.
 */
const ChunkSizeConfig: React.FC<ChunkSizeConfigProps> = ({ value, onChange, disabled = false }) => {
  return (
    <ControlContainer className="flex-1 flex flex-col" title="Chunk Size">
      <div className="flex-1 flex flex-col justify-center">
        <ChunkSizeSelector value={value} onChange={onChange} disabled={disabled} />
      </div>
    </ControlContainer>
  );
};

export default ChunkSizeConfig;
