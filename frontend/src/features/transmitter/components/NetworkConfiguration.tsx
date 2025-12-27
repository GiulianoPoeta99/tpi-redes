import { Settings } from 'lucide-react';
import type React from 'react';
import ConfigGroup from '../../shared/components/ConfigGroup';
import PortProtocolConfig from '../../shared/components/PortProtocolConfig';
import TargetConfig from './TargetConfig';

interface NetworkConfigurationProps {
  ip: string;
  setIp: (ip: string) => void;
  openScan: () => void;
  status: 'idle' | 'sending' | 'success' | 'error';
  port: number | string;
  setPort: (port: number | string) => void;
  protocol: 'tcp' | 'udp';
  setProtocol: (protocol: 'tcp' | 'udp') => void;
  netInterface: string | null;
  setNetInterface: (val: string | null) => void;
}

const NetworkConfiguration: React.FC<NetworkConfigurationProps> = ({
  ip,
  setIp,
  openScan,
  status,
  port,
  setPort,
  protocol,
  setProtocol,
  netInterface,
  setNetInterface,
}) => {
  return (
    <ConfigGroup title="Network Configuration" icon={Settings} className="h-full">
      <div className="space-y-4">
        <TargetConfig ip={ip} setIp={setIp} onScan={openScan} disabled={status !== 'idle'} />

        <PortProtocolConfig
          port={port}
          setPort={setPort}
          protocol={protocol}
          setProtocol={setProtocol}
          interfaceVal={netInterface}
          setInterfaceVal={setNetInterface}
          disabled={status !== 'idle'}
        />
      </div>
    </ConfigGroup>
  );
};

export default NetworkConfiguration;
