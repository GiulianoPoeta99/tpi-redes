import type React from 'react';

interface ProtocolToggleProps {
  protocol: 'tcp' | 'udp';
  onChange: (p: 'tcp' | 'udp') => void;
  disabled?: boolean;
}

const ProtocolToggle: React.FC<ProtocolToggleProps> = ({
  protocol,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex-1">
      <span className="text-xs text-gray-400 block mb-1">Protocol</span>
      <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-600">
        {['tcp', 'udp'].map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p as 'tcp' | 'udp')}
            className={`flex-1 py-1.5 text-sm rounded font-medium transition-all font-mono ${
              protocol === p
                ? p === 'tcp'
                  ? 'bg-proto-tcp text-white shadow-lg shadow-proto-tcp/20'
                  : 'bg-proto-udp text-white shadow-lg shadow-proto-udp/20'
                : 'text-gray-400 hover:text-gray-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProtocolToggle;
