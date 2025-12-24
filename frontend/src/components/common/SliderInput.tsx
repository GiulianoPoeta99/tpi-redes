import type React from 'react';

interface SliderInputProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  label?: string;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  accentColor?: 'blue' | 'red';
}

const SliderInput: React.FC<SliderInputProps> = ({
  value,
  min,
  max,
  step,
  onChange,
  label,
  headerRight,
  footer,
  disabled = false,
  className = '',
  accentColor = 'blue',
}) => {
  const accentClass = accentColor === 'red' ? 'accent-red-500' : 'accent-blue-500';

  return (
    <div className={`bg-gray-900/50 p-3 rounded-xl border border-gray-700/50 flex flex-col justify-center ${className}`}>
      {(label || headerRight) && (
        <div className="flex justify-between items-end mb-2">
          {label && (
            <label className="text-xs font-bold text-gray-500 uppercase">
              {label}
            </label>
          )}
          {headerRight}
        </div>
      )}

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${accentClass}`}
        />
      </div>

      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
};

export default SliderInput;
