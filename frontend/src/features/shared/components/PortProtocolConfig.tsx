import type React from 'react';
import InputGroup from './InputGroup';
import InterfaceSelector from './InterfaceSelector';
import PortInput from './PortInput';
import ProtocolToggle from './ProtocolToggle';

/**
 * Props for the PortProtocolConfig component.
 *
 * @property port - The current port value.
 * @property setPort - Callback to update the port.
 * @property protocol - The current protocol (TCP/UDP).
 * @property setProtocol - Callback to update the protocol.
 * @property interfaceVal - The selected network interface.
 * @property setInterfaceVal - Callback to update the interface.
 * @property disabled - Whether the configuration inputs are disabled.
 */
interface PortProtocolConfigProps {
  port: number | string;
  setPort: (val: number | string) => void;
  protocol: 'tcp' | 'udp';
  setProtocol: (val: 'tcp' | 'udp') => void;
  interfaceVal: string | null;
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
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="min-w-0">
          <span className="text-xs text-gray-400 block mb-1">Port</span>
          <PortInput
            value={port}
            onChange={setPort}
            placeholder="8080"
            disabled={disabled}
            className="w-full"
          />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-gray-400 block mb-1">Protocol</span>
          <ProtocolToggle
            protocol={protocol}
            onChange={setProtocol}
            disabled={disabled}
            className="w-full"
          />
        </div>
        <div className="min-w-0 sm:col-span-2 lg:col-span-1">
          <span className="text-xs text-gray-400 block mb-1">Interface</span>
          <InterfaceSelector
            value={interfaceVal}
            onChange={setInterfaceVal}
            disabled={disabled}
            className="w-full"
          />
        </div>
      </div>
    </InputGroup>
  );
};

export default PortProtocolConfig;
