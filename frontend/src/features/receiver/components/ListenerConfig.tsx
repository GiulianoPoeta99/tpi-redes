import { Power, Settings } from 'lucide-react';
import type React from 'react';
import ConfigGroup from '../../shared/components/ConfigGroup';
import PortProtocolConfig from '../../shared/components/PortProtocolConfig';
import SubmitButton from '../../shared/components/SubmitButton';

/**
 * Props for the ListenerConfig component.
 *
 * @property port - The port to listen on.
 * @property setPort - Callback to update the port.
 * @property protocol - The protocol to use (TCP/UDP).
 * @property setProtocol - Callback to update the protocol.
 * @property netInterface - The network interface to bind to.
 * @property setNetInterface - Callback to update the network interface.
 * @property isConnected - Whether the server is currently running.
 * @property toggleServer - Callback to start/stop the server.
 */
interface ListenerConfigProps {
  port: number | string;
  setPort: (port: number | string) => void;
  protocol: 'tcp' | 'udp';
  setProtocol: (protocol: 'tcp' | 'udp') => void;
  netInterface: string | null;
  setNetInterface: (val: string | null) => void;
  isConnected: boolean;
  toggleServer: () => void;
}

/**
 * Configuration form for setting up the listener (receiver) server.
 */
const ListenerConfig: React.FC<ListenerConfigProps> = ({
  port,
  setPort,
  protocol,
  setProtocol,
  netInterface,
  setNetInterface,
  isConnected,
  toggleServer,
}) => {
  return (
    <ConfigGroup title="Listener Config" icon={Settings}>
      <div className="flex flex-col gap-6">
        <PortProtocolConfig
          port={port}
          setPort={setPort}
          protocol={protocol}
          setProtocol={setProtocol}
          interfaceVal={netInterface}
          setInterfaceVal={setNetInterface}
          disabled={isConnected}
        />

        <SubmitButton
          variant={isConnected ? 'danger' : 'primary'}
          onClick={toggleServer}
          className={`text-white ${
            !isConnected
              ? 'bg-blue-600 hover:bg-blue-500 ring-blue-500 shadow-blue-900/20'
              : 'bg-red-600 hover:bg-red-500 ring-red-500 shadow-red-900/20'
          }`}
          icon={<Power size={24} />}
        >
          {isConnected ? 'STOP' : 'START'}
        </SubmitButton>
      </div>
    </ConfigGroup>
  );
};

export default ListenerConfig;
