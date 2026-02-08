import type React from 'react';
import { DEFAULT_PROXY_PORT } from '../../../config/constants';
import InputGroup from '../../shared/components/InputGroup';
import InterfaceSelector from '../../shared/components/InterfaceSelector';
import PortInput from '../../shared/components/PortInput';
import ProtocolToggle from '../../shared/components/ProtocolToggle';

/**
 * Props for MitmProxyConfig.
 *
 * @property listenPort - The port the proxy should listen on.
 * @property onChange - Callback to update the listening port.
 * @property interfaceName - The network interface to bind/sniff on.
 * @property onInterfaceChange - Callback to update the interface.
 * @property protocol - Protocol to use (tcp/udp).
 * @property onProtocolChange - Callback to update protocol.
 * @property disabled - Whether the input is disabled (e.g. while running).
 */
interface MitmProxyConfigProps {
  listenPort: number | string;
  onChange: (val: number | string) => void;
  interfaceName?: string;
  onInterfaceChange: (val: string) => void;
  protocol?: 'tcp' | 'udp';
  onProtocolChange: (val: 'tcp' | 'udp') => void;
  disabled?: boolean;
}

/**
 * Configuration for the Proxy Listener side of the MITM setup.
 */
const MitmProxyConfig: React.FC<MitmProxyConfigProps> = ({
  listenPort,
  onChange,
  interfaceName,
  onInterfaceChange,
  protocol = 'tcp',
  onProtocolChange,
  disabled = false,
}) => {
  return (
    <InputGroup label="Proxy Listener" indicatorColor="bg-green-500" className="h-full">
      <div className="grid w-full grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(6rem,0.9fr)_minmax(0,1.8fr)_minmax(6rem,0.9fr)] gap-3 items-start">
        <div className="min-w-0">
          <span className="text-xs text-gray-400 block mb-1">Proto</span>
          <ProtocolToggle
            protocol={protocol}
            onChange={onProtocolChange}
            disabled={disabled}
            className="w-full h-10"
          />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-gray-400 block mb-1">Interface</span>
          <InterfaceSelector
            value={interfaceName || null}
            onChange={(val) => onInterfaceChange(val || '')}
            disabled={disabled}
            className="w-full"
          />
        </div>
        <div className="min-w-0 sm:col-span-2 xl:col-span-1">
          <span className="text-xs text-gray-400 block mb-1">Port</span>
          <PortInput
            value={listenPort}
            onChange={onChange}
            disabled={disabled}
            placeholder={String(DEFAULT_PROXY_PORT)}
            className="w-full"
          />
        </div>
      </div>
    </InputGroup>
  );
};

export default MitmProxyConfig;
