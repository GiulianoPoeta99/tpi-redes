import { Power, Settings } from 'lucide-react';
import type React from 'react';
import ConfigGroup from '../../shared/components/ConfigGroup';
import PortProtocolConfig from '../../shared/components/PortProtocolConfig';
import SubmitButton from '../../shared/components/SubmitButton';

/**
 * Props for the ListenerConfig component.
 */
interface ListenerConfigProps {
  /**
   * The port to listen on.
   */
  port: number | string;
  /**
   * Callback to update the port.
   */
  setPort: (port: number | string) => void;
  /**
   * The protocol to use (TCP/UDP).
   */
  protocol: 'tcp' | 'udp';
  /**
   * Callback to update the protocol.
   */
  setProtocol: (protocol: 'tcp' | 'udp') => void;
  /**
   * The network interface to bind to.
   */
  netInterface: string | null;
  /**
   * Callback to update the network interface.
   */
  setNetInterface: (val: string | null) => void;
  /**
   * Whether the server is currently running.
   */
  isConnected: boolean;
  /**
   * Callback to start/stop the server.
   */
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
