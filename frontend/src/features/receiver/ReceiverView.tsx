import { Activity, Download, Power, Settings } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import ConfigGroup from '../shared/components/ConfigGroup';
import FileListItem from '../shared/components/FileListItem';
import HeaderStatusCard from '../shared/components/HeaderStatusCard';
import PortProtocolConfig from '../shared/components/PortProtocolConfig';
import SubmitButton from '../shared/components/SubmitButton';
import { StorageService } from '../shared/services/StorageService';
import SlidingWindow from './components/SlidingWindow';

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
          } else if (json.type === 'TRANSFER_UPDATE') {
            if (json.status === 'start') setTransferActive(true);
            if (json.status === 'complete') {
              setTransferActive(false);
              setLastFile(json.filename || 'Unknown File');

              StorageService.addHistoryItem({
                id: Date.now().toString() + Math.random(),
                timestamp: Date.now(),
                filename: json.filename || 'unknown',
                size: json.total || 0,
                direction: 'received',
                status: 'success',
                protocol: protocol.toUpperCase(),
              });

              // Toast handled by Dashboard
            }
          } else if (json.type === 'ERROR') {
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
          <ConfigGroup title="Listener Config" icon={Settings}>
            <div className="flex flex-col gap-6">
              {/* Row 1: Port & Protocol Group */}
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
        </div>

        {/* Visualizer / Status Area - Flexible Bottom */}
        <div className="flex-1 min-h-[250px] flex flex-col">
          <div className="flex-1 bg-gray-900/50 rounded-2xl border border-gray-700/50 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
            {!isConnected ? (
              <div className="text-center group">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gray-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
                  <div className="bg-gray-800/50 p-6 rounded-full mb-6 border border-white/5 group-hover:border-white/10 transition-colors hover:shadow-lg hover:shadow-gray-900/40">
                    <Power
                      className="text-gray-500 group-hover:text-gray-400 transition-colors"
                      size={48}
                    />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">Server is Offline</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  Configure settings and click Start to listen.
                </p>
              </div>
            ) : transferActive ? (
              <div className="w-full h-full p-4 relative">
                {/* Visualizer replaces logic when active */}
                <SlidingWindow />
                <div className="absolute bottom-4 left-0 right-0 text-center text-green-400 animate-pulse font-mono text-sm bg-black/50 py-1 backdrop-blur-md border-y border-green-500/20">
                  RECEIVING DATA STREAM...
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-green-500/20 blur-2xl animate-pulse rounded-full" />
                  <Activity
                    size={64}
                    className="text-green-500 relative z-10 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                  />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Ready to Receive</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  Server is listening on{' '}
                  <span className="text-green-400 font-mono font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                    {localIp}:{port}
                  </span>{' '}
                  <span className="text-xs ml-1 text-gray-500">({protocol.toUpperCase()})</span>
                </p>

                {lastFile && (
                  <FileListItem
                    filename={lastFile}
                    status="success"
                    className="mt-8 max-w-sm mx-auto border-green-500/20 bg-green-500/5 hover:bg-green-500/10"
                    iconClassName="bg-green-500/20 text-green-400"
                    details={
                      <span className="text-[10px] uppercase font-bold text-green-500/50">
                        Last Received
                      </span>
                    }
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiverView;
