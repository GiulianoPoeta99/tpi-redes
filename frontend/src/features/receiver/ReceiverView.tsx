import { Download } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import HeaderStatusCard from '../shared/components/HeaderStatusCard';
import { StorageService } from '../shared/services/StorageService';
import ListenerConfig from './components/ListenerConfig';
import ReceiverStatus from './components/ReceiverStatus';

const ReceiverView: React.FC<{
  setBusy: (busy: boolean) => void;
  setHeaderContent: (content: React.ReactNode) => void;
}> = ({ setBusy, setHeaderContent }) => {
  const [port, setPort] = useState<number | string>(8080);
  const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [netInterface, setNetInterface] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Derived state for visualizer
  const [transferActive, setTransferActive] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);
  const [localIp, setLocalIp] = useState<string>('Loading...');

  // Lift Header Content
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
    // Fetch local IP
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
          // Cast to a flexible interface for event handling
          const event = json as {
            type?: string;
            status?: string;
            filename?: string;
            total?: number;
          };

          if (event.type === 'SERVER_READY') {
            setIsConnected(true);
            setBusy(true);
            // Toast handled by Dashboard
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

              // Toast handled by Dashboard
            }
          } else if (event.type === 'ERROR') {
            setIsConnected(false);
            setTransferActive(false);
            setBusy(false);
            // Toast handled by Dashboard
          }
        });
      } catch (_e) {
        /* ignore */
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
      {/* Content Stack */}
      <div className="flex flex-col gap-6 flex-1 min-h-0">
        {/* Config Panel - Stacked Top */}
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

        {/* Visualizer / Status Area - Flexible Bottom */}
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
