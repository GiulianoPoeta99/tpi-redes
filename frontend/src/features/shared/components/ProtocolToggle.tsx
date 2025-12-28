import type React from 'react';
import BinarySwitch from './BinarySwitch';

/**
 * Props for the ProtocolToggle component.
 */
interface ProtocolToggleProps {
  /**
   * The selected protocol.
   */
  protocol: 'tcp' | 'udp';
  /**
   * Callback when protocol changes.
   */
  onChange: (p: 'tcp' | 'udp') => void;
  disabled?: boolean;
  className?: string;
}

/**
 * A toggle switch specifically for selecting between TCP and UDP protocols.
 */
const ProtocolToggle: React.FC<ProtocolToggleProps> = ({
  protocol,
  onChange,
  disabled = false,
  className,
}) => {
  return (
    <BinarySwitch
      value={protocol}
      options={['tcp', 'udp']}
      onChange={onChange}
      disabled={disabled}
      className={className}
      activeColor={(p) =>
        p === 'tcp'
          ? 'bg-proto-tcp text-white shadow-lg shadow-proto-tcp/20'
          : 'bg-proto-udp text-white shadow-lg shadow-proto-udp/20'
      }
    />
  );
};

export default ProtocolToggle;
