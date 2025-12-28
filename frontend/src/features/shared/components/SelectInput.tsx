import { Check, ChevronDown } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

import { type SelectOption } from '../types';

/**
 * Props for SelectInput.
 *
 * @property value - Currently selected value.
 * @property onChange - Callback when value changes.
 * @property options - List of available options.
 * @property disabled - Whether the input is disabled.
 * @property placeholder - Placeholder text when no value is selected.
 * @property icon - Optional icon to display on the left.
 * @property className - Optional additional CSS classes.
 * @property loading - Whether to show a loading state.
 * @property align - Dropdown alignment ('left' or 'right'). Defaults to 'left'.
 */
interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  loading?: boolean;
  align?: 'left' | 'right';
}

/**
 * A styled dropdown select component.
 */
const SelectInput: React.FC<SelectInputProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
  icon,
  className = '',
  loading = false,
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (newValue: string) => {
    if (!newValue) return;
    onChange(newValue);
    setIsOpen(false);
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder || 'Select...';

  return (
    <div className={`relative group ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`w-full bg-gray-800 border border-gray-600 rounded-lg text-white font-mono text-left
                   py-2 pl-3 pr-8 relative transition-all outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                   ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-500 cursor-pointer'}
                   ${icon ? 'pl-9' : ''}
                   ${isOpen ? 'ring-1 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <span className="truncate block">{loading ? 'Loading...' : displayLabel}</span>

        {icon && (
          <div
            className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${disabled ? 'text-gray-500' : 'text-blue-400'}`}
          >
            {icon}
          </div>
        )}

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && !disabled && (
        <div
          className={`absolute top-[calc(100%+4px)] ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'} min-w-full w-max z-50 animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="bg-gray-800/95 backdrop-blur-xl border border-gray-700 shadow-2xl rounded-xl py-1 overflow-hidden ring-1 ring-black/5">
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {placeholder && (
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-white/5 transition-colors font-mono"
                >
                  {placeholder}
                </button>
              )}
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    className={`w-full text-left px-4 py-2 text-sm font-mono flex items-center justify-between gap-4 transition-colors
                                    ${opt.disabled ? 'opacity-50 cursor-not-allowed text-gray-600' : 'hover:bg-blue-500/10 hover:text-blue-200'}
                                    ${isSelected ? 'bg-blue-500/20 text-blue-300' : 'text-gray-300'}
                        `}
                  >
                    <span className="whitespace-nowrap">{opt.label}</span>
                    {isSelected && <Check size={14} className="text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectInput;
