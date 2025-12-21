import { Activity, Download, Power, Settings, Wifi } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { StorageService } from '../services/StorageService';
import Button from './common/Button';

import FileListItem from './common/FileListItem';
import GlassCard from './common/GlassCard';
import InputGroup from './common/InputGroup';
import InterfaceSelector from './common/InterfaceSelector';
import PortInput from './common/PortInput';
import ProtocolToggle from './common/ProtocolToggle';
import SlidingWindow from './SlidingWindow';

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
      <div className="min-w-[400px] bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 p-3 rounded-xl flex items-center justify-between shadow-lg gap-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Download className="text-purple-500" size={20} />
            Receiver Mode
          </h2>
          <p className="text-purple-200/60 text-xs">Listen for Incoming Files</p>
        </div>
        <div
          className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
            isConnected
              ? 'bg-green-500/20 border-green-500 text-green-400 animate-pulse'
              : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}
        >
          <Wifi size={16} />
          <span className="font-mono font-bold text-xs">
            {isConnected ? 'LISTENING' : 'OFFLINE'}
          </span>
        </div>
      </div>,
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

        // biome-ignore lint/suspicious/noExplicitAny: Parsed JSON
        events.forEach((json: any) => {
          if (json.type === 'SERVER_READY') {
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
          <GlassCard title="Listener Config" icon={Settings}>
            <div className="flex flex-col gap-6">
              {/* Row 1: Port & Protocol Group */}
              <InputGroup label="Port & Protocol">
                <div className="min-w-[100px]">
                  <span className="text-xs text-gray-400 block mb-1">Port</span>
                  <PortInput
                    value={port}
                    onChange={setPort}
                    disabled={isConnected}
                    placeholder="8080"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-xs text-gray-400 block mb-1">Interface</span>
                  <InterfaceSelector
                    value={netInterface}
                    onChange={setNetInterface}
                    disabled={isConnected}
                  />
                </div>
                <div>
                    <span className="text-xs text-gray-400 block mb-1">Protocol</span>
                    <ProtocolToggle protocol={protocol} onChange={setProtocol} disabled={isConnected} />
                </div>
              </InputGroup>

              {/* Row 2: IP & Button */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* IP Display */}
                <div className="p-4 bg-mode-rx-dim border border-mode-rx/20 rounded-xl flex flex-col justify-center h-full min-h-[84px]">
                  <span className="text-xs font-bold text-mode-rx uppercase block mb-1">
                    My IP Address
                  </span>
                  <span className="text-xl font-mono text-white tracking-wider flex items-center gap-2">
                    {localIp}
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  </span>
                </div>

                {/* Button */}
                <div className="h-full">
                  <Button
                    size="lg"
                    variant={isConnected ? 'danger' : 'primary'}
                    onClick={toggleServer}
                    className={`w-full h-full text-lg shadow-lg justify-center text-white ${
                      !isConnected
                        ? 'bg-blue-600 hover:bg-blue-500 ring-blue-500 shadow-blue-900/20'
                        : 'bg-red-600 hover:bg-red-500 ring-red-500 shadow-red-900/20'
                    }`}
                    icon={<Power size={24} />}
                  >
                    {isConnected ? 'STOP' : 'START'}
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>
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
