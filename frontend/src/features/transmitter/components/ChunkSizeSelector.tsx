import type React from 'react';
import SelectInput from '../../shared/components/SelectInput';

interface ChunkSizeSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const ChunkSizeSelector: React.FC<ChunkSizeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const options = [
    { value: '1024', label: '1 KB' },
    { value: '4096', label: '4 KB (Default)' },
    { value: '8192', label: '8 KB' },
    { value: '16384', label: '16 KB' },
    { value: '32768', label: '32 KB' },
    { value: '65536', label: '64 KB' },
  ];

  return (
    <SelectInput
      value={value.toString()}
      onChange={(val) => onChange(Number(val))}
      options={options}
      disabled={disabled}
      className="w-full"
    />
  );
};

export default ChunkSizeSelector;
