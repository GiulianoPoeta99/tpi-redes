import { Download } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import HeaderStatusCard from '../shared/components/HeaderStatusCard';
import { StorageService } from '../shared/services/StorageService';
import ListenerConfig from './components/ListenerConfig';
import ReceiverStatus from './components/ReceiverStatus';

/**
 * Props for ReceiverView.
 */
interface ReceiverViewProps {
  setBusy: (busy: boolean) => void;
  setHeaderContent: (content: React.ReactNode) => void;
}

/**
 * Main view for the Receiver mode.
 * Configures and controls the listening server.
 */
const ReceiverView: React.FC<ReceiverViewProps> = ({ setBusy, setHeaderContent }) => {
  const [port, setPort] = useState<number | string>(8080);
  const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [netInterface, setNetInterface] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);


  const [transferActive, setTransferActive] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);
  const [localIp, setLocalIp] = useState<string>('Loading...');


  useEffect(() => {
    setHeaderContent(
      <HeaderStatusCard
        title="Receiver Mode"
        subtitle="Listen for Incoming Files"
        icon={Download}
        variant="purple"
        status={isConnected ? 'active' : 'idle'}
        statusLabel={isConnected ? 'LISTENING' : 'OFFLINE'}
      />,
    );
    return () => setHeaderContent(null);
  }, [isConnected, setHeaderContent]);

  useEffect(() => {

    window.api
      .getLocalIp()
      .then(setLocalIp)
      .catch((_err) => setLocalIp('Error'));

    const cleanup = window.api.onLog((log: string) => {
      try {
        const parsed = JSON.parse(log);
        const events = Array.isArray(parsed) ? parsed : [parsed];

        events.forEach((json: unknown) => {
          if (typeof json !== 'object' || json === null) return;

          const event = json as {
            type?: string;
            status?: string;
            filename?: string;
            total?: number;
          };

          if (event.type === 'SERVER_READY') {
            setIsConnected(true);
            setBusy(true);

          } else if (event.type === 'TRANSFER_UPDATE') {
            if (event.status === 'start') setTransferActive(true);
            if (event.status === 'complete') {
              setTransferActive(false);
              setLastFile(event.filename || 'Unknown File');

              StorageService.addHistoryItem({
                id: Date.now().toString() + Math.random(),
                timestamp: Date.now(),
                filename: event.filename || 'unknown',
                size: event.total || 0,
                direction: 'received',
                status: 'success',
                protocol: protocol.toUpperCase(),
              });


            }
          } else if (event.type === 'ERROR') {
            setIsConnected(false);
            setTransferActive(false);
            setBusy(false);

          }
        });
      } catch (_e) {
      }
    });

    return cleanup;
  }, [setBusy, protocol]);

  const toggleServer = async () => {
    if (isConnected) {
      try {
        await window.api.stopProcess();
        setIsConnected(false);
        setBusy(false);
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        await window.api.startServer({
          port: Number(port),
          protocol,
          saveDir: './received_files',
          sniff: true,
          interface: netInterface,
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 relative overflow-hidden">
      <div className="flex flex-col gap-6 flex-1 min-h-0">
        <div className="shrink-0">
          <ListenerConfig
            port={port}
            setPort={setPort}
            protocol={protocol}
            setProtocol={setProtocol}
            netInterface={netInterface}
            setNetInterface={setNetInterface}
            isConnected={isConnected}
            toggleServer={toggleServer}
          />
        </div>

        <ReceiverStatus
          isConnected={isConnected}
          transferActive={transferActive}
          localIp={localIp}
          port={port}
          protocol={protocol}
          lastFile={lastFile}
        />
      </div>
    </div>
  );
};

export default ReceiverView;
