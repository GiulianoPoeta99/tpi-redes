import type React from 'react';
import BinarySwitch from './BinarySwitch';

/**
 * Props for the ProtocolToggle component.
 *
 * @property protocol - The selected protocol.
 * @property onChange - Callback when protocol changes.
 * @property disabled - Whether the toggle is disabled.
 * @property className - Optional additional CSS classes.
 */
interface ProtocolToggleProps {
  protocol: 'tcp' | 'udp';
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
