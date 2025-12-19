import { ChevronDown, ChevronUp } from 'lucide-react';
import type React from 'react';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min = 1,
  max = 65535,
  placeholder,
  disabled = false,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = Number(e.target.value);
    // Allow empty string or partial typing, but if it's a number, clamp it eventually
    // For simple UX, we'll just pass the number. Parent can handle strict validation if needed.
    onChange(newVal);
  };

  const increment = () => {
    if (disabled) return;
    if (max !== undefined && value >= max) return;
    onChange(value + 1);
  };

  const decrement = () => {
    if (disabled) return;
    if (min !== undefined && value <= min) return;
    onChange(value - 1);
  };

  return (
    <div className={`relative w-full ${className}`}>
      <input
        type="number"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        min={min}
        max={max}
        placeholder={placeholder}
        className={`w-full bg-gray-800 border border-gray-600 rounded-lg pl-3 pr-8 py-2 text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all [&::-webkit-inner-spin-button]:appearance-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      />
      <div className="absolute right-1 top-1 bottom-1 w-5 flex flex-col gap-0.5">
        <button
          type="button"
          onClick={increment}
          disabled={disabled || (max !== undefined && value >= max)}
          className="flex-1 bg-gray-700/50 hover:bg-gray-600 rounded-t text-gray-400 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronUp size={10} />
        </button>
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || (min !== undefined && value <= min)}
          className="flex-1 bg-gray-700/50 hover:bg-gray-600 rounded-b text-gray-400 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronDown size={10} />
        </button>
      </div>
    </div>
  );
};

export default NumberInput;
