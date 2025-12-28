import type React from 'react';
import InputGroup from './InputGroup';
import InterfaceSelector from './InterfaceSelector';
import PortInput from './PortInput';
import ProtocolToggle from './ProtocolToggle';

/**
 * Props for the PortProtocolConfig component.
 */
interface PortProtocolConfigProps {
  /**
   * The current port value.
   */
  port: number | string;
  /**
   * Callback to update the port.
   */
  setPort: (val: number | string) => void;
  /**
   * The current protocol (TCP/UDP).
   */
  protocol: 'tcp' | 'udp';
  /**
   * Callback to update the protocol.
   */
  setProtocol: (val: 'tcp' | 'udp') => void;
  /**
   * The selected network interface.
   */
  interfaceVal: string | null;
  /**
   * Callback to update the interface.
   */
  setInterfaceVal: (val: string | null) => void;
  disabled?: boolean;
}

/**
 * A composite component for configuring port, protocol, and network interface settings.
 */
const PortProtocolConfig: React.FC<PortProtocolConfigProps> = ({
  port,
  setPort,
  protocol,
  setProtocol,
  interfaceVal,
  setInterfaceVal,
  disabled = false,
}) => {
  return (
    <InputGroup label="Port & Protocol">
      <div className="flex-1 min-w-[90px]">
        <span className="text-xs text-gray-400 block mb-1">Port</span>
        <PortInput
          value={port}
          onChange={setPort}
          placeholder="8080"
          disabled={disabled}
          className="w-full"
        />
      </div>
      <div className="flex-[1.5] min-w-[120px]">
        <span className="text-xs text-gray-400 block mb-1">Protocol</span>
        <ProtocolToggle
          protocol={protocol}
          onChange={setProtocol}
          disabled={disabled}
          className="w-full"
        />
      </div>
      <div className="flex-[2] min-w-[150px]">
        <span className="text-xs text-gray-400 block mb-1">Interface</span>
        <InterfaceSelector
          value={interfaceVal}
          onChange={setInterfaceVal}
          disabled={disabled}
          className="w-full"
        />
      </div>
    </InputGroup>
  );
};

export default PortProtocolConfig;
