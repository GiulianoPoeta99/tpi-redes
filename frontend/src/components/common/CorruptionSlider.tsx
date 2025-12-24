import type React from 'react';
import SliderInput from './SliderInput';

interface CorruptionSliderProps {
  value: number; // 0.0 - 1.0
  onChange: (val: number) => void;
  disabled?: boolean;
}

const CorruptionSlider: React.FC<CorruptionSliderProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const presets = [
    {
      label: 'Bit Flip',
      val: 0.01,
      color: 'hover:bg-yellow-900/50 border-yellow-700 text-yellow-500',
    },
    {
      label: 'Noise',
      val: 0.2,
      color: 'hover:bg-orange-900/50 border-orange-700 text-orange-500',
    },
    {
      label: 'Fuzz',
      val: 0.8,
      color: 'hover:bg-red-900/50 border-red-700 text-red-500',
    },
  ];

  return (
    <SliderInput
      value={value}
      min={0}
      max={1}
      step={0.01}
      onChange={onChange}
      label="Data Corruption Rate"
      disabled={disabled}
      accentColor="red"
      headerRight={
        <span
          className={`text-2xl font-mono font-bold transition-colors ${
            value > 0 ? 'text-red-500' : 'text-gray-500'
          }`}
        >
          {Math.round(value * 100)}%
        </span>
      }
      footer={
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-xs text-gray-500 font-mono px-1">
            <span>Passthrough</span>
            <span>Noise</span>
            <span>Destructive</span>
          </div>

          <div className="flex gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => !disabled && onChange(p.val)}
                disabled={disabled}
                className={`flex-1 py-1.5 text-xs font-mono border rounded transition-all bg-gray-800/50 disabled:opacity-50 disabled:cursor-not-allowed ${p.color}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      }
    />
  );
};

export default CorruptionSlider;
