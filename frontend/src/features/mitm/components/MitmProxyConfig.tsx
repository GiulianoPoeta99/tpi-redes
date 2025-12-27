import type React from 'react';
import InputGroup from '../../shared/components/InputGroup';
import PortInput from '../../shared/components/PortInput';

interface MitmProxyConfigProps {
  listenPort: number | string;
  onChange: (val: number | string) => void;
  disabled?: boolean;
}

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
