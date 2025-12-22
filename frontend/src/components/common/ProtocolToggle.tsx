import type React from 'react';
import BinarySwitch from './BinarySwitch';

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
      <BinarySwitch
        value={protocol}
        options={['tcp', 'udp']}
        onChange={onChange}
        disabled={disabled}
        activeColor={(p) =>
          p === 'tcp'
            ? 'bg-proto-tcp text-white shadow-lg shadow-proto-tcp/20'
            : 'bg-proto-udp text-white shadow-lg shadow-proto-udp/20'
        }
      />
    </div>
  );
};

export default ProtocolToggle;
