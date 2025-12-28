import { Settings } from 'lucide-react';
import type React from 'react';
import ConfigGroup from '../../shared/components/ConfigGroup';
import PortProtocolConfig from '../../shared/components/PortProtocolConfig';
import TargetConfig from './TargetConfig';

/**
 * Props for the NetworkConfiguration component.
 */
interface NetworkConfigurationProps {
  /**
   * Target IP address.
   */
  ip: string;
  /**
   * Callback to update IP.
   */
  setIp: (ip: string) => void;
  /**
   * Callback to open the peer scan modal.
   */
  openScan: () => void;
  /**
   * Current transmission status.
   */
  status: 'idle' | 'sending' | 'success' | 'error';
  /**
   * Target port.
   */
  port: number | string;
  /**
   * Callback to update port.
   */
  setPort: (port: number | string) => void;
  /**
   * Network protocol (TCP/UDP).
   */
  protocol: 'tcp' | 'udp';
  /**
   * Callback to update protocol.
   */
  setProtocol: (protocol: 'tcp' | 'udp') => void;
  /**
   * Selected network interface.
   */
  netInterface: string | null;
  /**
   * Callback to update network interface.
   */
  setNetInterface: (val: string | null) => void;
}

/**
 * A combined configuration form for setting up network parameters for transmission.
 */
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
