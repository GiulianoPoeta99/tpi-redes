import type React from 'react';
import InputGroup from '../../shared/components/InputGroup';
import PortInput from '../../shared/components/PortInput';

/**
 * Props for MitmProxyConfig.
 *
 * @property listenPort - The port the proxy should listen on.
 * @property onChange - Callback to update the listening port.
 * @property disabled - Whether the input is disabled (e.g. while running).
 */
interface MitmProxyConfigProps {
  listenPort: number | string;
  onChange: (val: number | string) => void;
  disabled?: boolean;
}

/**
 * Configuration for the Proxy Listener side of the MITM setup.
 */
const MitmProxyConfig: React.FC<MitmProxyConfigProps> = ({
  listenPort,
  onChange,
  disabled = false,
}) => {
  return (
    <InputGroup label="Proxy Listener" indicatorColor="bg-green-500" className="h-full">
      <div className="flex-1 min-w-[120px]">
        <span className="text-xs text-gray-400 block mb-1">Local Port</span>
        <PortInput
          value={listenPort}
          onChange={onChange}
          disabled={disabled}
          placeholder="8081"
          className="w-full"
        />
      </div>
    </InputGroup>
  );
};

export default MitmProxyConfig;
