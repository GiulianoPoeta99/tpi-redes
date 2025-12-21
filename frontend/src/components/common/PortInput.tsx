import { AlertTriangle } from 'lucide-react';
import type React from 'react';
import NumberInput from './NumberInput';

interface PortInputProps {
  value: number | string;
  onChange: (value: number | string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const PortInput: React.FC<PortInputProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = '8080',
  className = '',
}) => {
  const isSystemPort = typeof value === 'number' && value > 0 && value < 1024;

  return (
    <div className={`relative ${className}`}>
      <NumberInput
        value={value}
        onChange={onChange}
        min={1}
        max={65535}
        disabled={disabled}
        placeholder={placeholder}
        className={isSystemPort ? 'border-yellow-500/50 focus:border-yellow-500' : ''}
      />
      
      {/* System Port Warning */}
      {isSystemPort && !disabled && (
        <div className="absolute -top-2 -right-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 backdrop-blur-sm shadow-sm pointer-events-none">
          <AlertTriangle size={10} />
          <span>SYSTEM</span>
        </div>
      )}
    </div>
  );
};

export default PortInput;
