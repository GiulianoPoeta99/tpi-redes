import { AlertTriangle } from 'lucide-react';
import type React from 'react';
import { type ClipboardEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

/**
 * Props for IpInput.
 */
interface IpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * A segmented input component for IP v4 addresses.
 * Handles validation, auto-advancement, and pasting.
 */
const IpInput: React.FC<IpInputProps> = ({ value, onChange, disabled = false, className = '' }) => {
  const [octets, setOctets] = useState<string[]>(['', '', '', '']);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (value !== undefined) {
      const parts = value.split('.');
      if (parts.length === 4) {
        if (parts.join('.') !== octets.join('.')) {
          setOctets(parts);
        }
      } else if (value === '') {
        if (octets.some((o) => o !== '')) {
          setOctets(['', '', '', '']);
        }
      }
    }
  }, [value, octets]);

  const updateParent = (newOctets: string[]) => {
    const newValue = newOctets.join('.');
    onChange(newValue);
  };

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    if (val.length > 3) return;

    const num = Number(val);
    if (val !== '' && num > 255) {
      val = '255';
    }

    const newOctets = [...octets];
    newOctets[index] = val;
    setOctets(newOctets);
    updateParent(newOctets);

    if (val.length === 3 && index < 3) {
      inputsRef.current[index + 1]?.focus();
      inputsRef.current[index + 1]?.select();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '.' || e.key === 'Decimal') {
      e.preventDefault();
      if (index < 3) {
        inputsRef.current[index + 1]?.focus();
        inputsRef.current[index + 1]?.select();
      }
    } else if (e.key === 'Backspace' && !octets[index] && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0 && e.currentTarget.selectionStart === 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (
      e.key === 'ArrowRight' &&
      index < 3 &&
      e.currentTarget.selectionStart === octets[index].length
    ) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').trim();
    if (!text) return;

    const parts = text.split('.');

    if (parts.length === 4) {
      const cleanParts = parts.map((p) => {
        const num = Number(p);
        return !Number.isNaN(num) && num >= 0 && num <= 255 ? num.toString() : '';
      });

      setOctets(cleanParts);
      updateParent(cleanParts);
      inputsRef.current[3]?.focus();
    }
  };

  const isReserved = value === '0.0.0.0' || value === '255.255.255.255';

  return (
    <div className={`relative ${className}`}>
      <div
        className={`flex items-center bg-gray-800 border rounded-lg px-2 py-2 transition-all ${
          isReserved
            ? 'border-yellow-500/50 focus-within:ring-1 focus-within:ring-yellow-500/50'
            : 'border-gray-600 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {octets.map((octet, i) => (
          <div key={`octet-${i}`} className="flex items-center flex-1">
            <input
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              value={octet}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={disabled}
              placeholder="0"
              className="w-full min-w-[2ch] bg-transparent text-center text-white font-mono placeholder-gray-600 outline-none p-0 appearance-none text-sm"
              maxLength={3}
            />
            {i < 3 && <span className="text-gray-500 font-bold mx-0.5 select-none">.</span>}
          </div>
        ))}
      </div>

      {isReserved && !disabled && (
        <div className="absolute -top-2 -right-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 backdrop-blur-sm shadow-sm pointer-events-none">
          <AlertTriangle size={10} />
          <span>RESERVED</span>
        </div>
      )}
    </div>
  );
};

export default IpInput;
