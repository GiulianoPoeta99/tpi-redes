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
    <ControlContainer className="flex-1 flex flex-col justify-center gap-2" padding="p-3">
      <label className="block text-xs font-bold text-gray-500 uppercase">
        Chunk Size
      </label>
      <ChunkSizeSelector
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </ControlContainer>
  );
};

export default ChunkSizeConfig;
