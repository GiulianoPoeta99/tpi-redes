import type React from 'react';

export interface BinarySwitchProps<T extends string> {
  value: T;
  options: [T, T];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  formatLabel?: (value: T) => React.ReactNode;
  activeColor?: (value: T) => string;
}

const BinarySwitch = <T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  className = '',
  formatLabel = (v) => v.toUpperCase(),
  activeColor,
}: BinarySwitchProps<T>) => {
  return (
    <div className={`flex bg-gray-800 p-1 rounded-lg border border-gray-600 ${className}`}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          className={`flex-1 py-1.5 text-sm rounded font-medium transition-all font-mono ${
            value === option
              ? activeColor
                ? activeColor(option) // Custom active style
                : 'bg-blue-600 text-white shadow-lg' // Default active style
              : 'text-gray-400 hover:text-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {formatLabel(option)}
        </button>
      ))}
    </div>
  );
};

export default BinarySwitch;
