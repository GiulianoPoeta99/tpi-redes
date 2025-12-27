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

import ControlContainer from './ControlContainer';

// ... (props interface kept in file, just hidden in diff) Since I am replacing the whole return block and imports I need to be careful.
// Actually, let's just use replace on the whole file or the return block + import.

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

  const titleNode =
    label || headerRight ? (
      <div className="w-full flex-1 flex justify-between items-center">
        <span>{label}</span>
        {headerRight}
      </div>
    ) : undefined;

  return (
    <ControlContainer className={`flex flex-col ${className}`} title={titleNode}>
      <div className="flex-1 flex flex-col justify-center">
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
    </ControlContainer>
  );
};

export default SliderInput;
