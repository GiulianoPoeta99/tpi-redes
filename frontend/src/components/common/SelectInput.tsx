import { ChevronDown } from 'lucide-react';
import type React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  placeholder?: string; // Often acts as the "default" or "select one" option
  icon?: React.ReactNode;
  className?: string;
  loading?: boolean;
}

const SelectInput: React.FC<SelectInputProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
  icon,
  className = '',
  loading = false,
}) => {
  return (
    <div className={`relative group min-w-[120px] ${className}`}>
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-400">
          {icon}
        </div>
      )}
      
      <select
        className={`w-full bg-gray-800 border border-gray-600 rounded-lg text-white font-mono pl-3 pr-8 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          icon ? 'pl-9' : ''
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        
        {loading ? (
          <option disabled>Loading...</option>
        ) : (
          options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))
        )}
      </select>
      
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
        <ChevronDown size={14} />
      </div>
    </div>
  );
};

export default SelectInput;
