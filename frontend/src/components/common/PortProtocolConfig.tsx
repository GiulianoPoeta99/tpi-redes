import type React from 'react';
import InputGroup from './InputGroup';
import InterfaceSelector from './InterfaceSelector';
import PortInput from './PortInput';
import ProtocolToggle from './ProtocolToggle';

interface PortProtocolConfigProps {
  port: number | string;
  setPort: (val: number | string) => void;
  protocol: 'tcp' | 'udp';
  setProtocol: (val: 'tcp' | 'udp') => void;
  interfaceVal: string | null;
  setInterfaceVal: (val: string | null) => void;
  disabled?: boolean;
}

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
