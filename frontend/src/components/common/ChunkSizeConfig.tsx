import type React from 'react';
import ChunkSizeSelector from './ChunkSizeSelector';
import ControlContainer from './ControlContainer';

interface ChunkSizeConfigProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const ChunkSizeConfig: React.FC<ChunkSizeConfigProps> = ({ value, onChange, disabled = false }) => {
  return (
    <ControlContainer className="flex-1 flex flex-col" title="Chunk Size">
      <div className="flex-1 flex flex-col justify-center">
        <ChunkSizeSelector
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </ControlContainer>
  );
};

export default ChunkSizeConfig;
