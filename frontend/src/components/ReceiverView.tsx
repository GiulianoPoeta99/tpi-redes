import type React from 'react';
import { useEffect, useState } from 'react';
import { StorageService } from '../services/StorageService';
import SlidingWindow from './SlidingWindow';
import { Radio, Download, Activity, Settings, Wifi, Power, FileText } from 'lucide-react';
import GradientCard from './common/GradientCard';
import GlassCard from './common/GlassCard';
import InputGroup from './common/InputGroup';
import ProtocolToggle from './common/ProtocolToggle';

const ReceiverView: React.FC<{ setBusy: (busy: boolean) => void }> = ({ setBusy }) => {
  const [port, setPort] = useState(8080);
  const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [isConnected, setIsConnected] = useState(false);

  // Derived state for visualizer
  const [transferActive, setTransferActive] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);
  const [localIp, setLocalIp] = useState<string>('Loading...');

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
        await window.api.startServer({ port, protocol, saveDir: './received_files', sniff: true });
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 relative overflow-hidden">
      {/* Header */}
      <GradientCard 
          title="Receiver Mode" 
          description="Listen for incoming file transfers. Configure port and wait for connections."
          icon={Download}
          variant="blue"
      >
           <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${isConnected ? 'bg-green-500/20 border-green-500 text-green-400 animate-pulse' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
              <Wifi size={18} />
              <span className="font-mono font-bold text-sm">
                  {isConnected ? 'LISTENING' : 'OFFLINE'}
              </span>
           </div>
      </GradientCard>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
           {/* Config Panel - 1 Col */}
           <div className="lg:col-span-1 flex flex-col gap-6">
               <GlassCard title="Listener Config" icon={Settings} className="flex-1">
                   <div className="space-y-6 flex flex-col h-full">
                       {/* IP Display (ReadOnly) */}
                       <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
                          <span className="text-xs font-bold text-blue-400 uppercase block mb-1">My IP Address</span>
                          <span className="text-xl font-mono text-white tracking-wider flex items-center gap-2">
                              {localIp}
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          </span>
                       </div>

                       <InputGroup label="Port & Protocol">
                           <div className="flex-1">
                              <span className="text-xs text-gray-400 block mb-1">Port</span>
                              <input
                                type="number"
                                disabled={isConnected}
                                value={port}
                                onChange={(e) => setPort(Number(e.target.value))}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                           </div>
                           <ProtocolToggle protocol={protocol} onChange={setProtocol} disabled={isConnected} />
                       </InputGroup>
                       
                       <div className="flex-1"></div>

                       <button
                        type="button"
                        onClick={toggleServer}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 ${
                            isConnected
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'
                            : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20'
                        }`}
                        >
                            <Power size={20} />
                            {isConnected ? 'STOP SERVER' : 'START SERVER'}
                        </button>
                   </div>
               </GlassCard>
           </div>

           {/* Visualizer / Status Area - 2 Cols */}
           <div className="lg:col-span-2 h-full min-h-[300px] flex flex-col">
               <div className="flex-1 bg-gray-900/50 rounded-2xl border border-gray-700/50 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                    {!isConnected ? (
                        <div className="text-center text-gray-500">
                             <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Activity size={32} className="opacity-50" />
                             </div>
                             <p className="text-lg font-medium">Server is Offline</p>
                             <p className="text-sm opacity-70">Configure settings and click Start to listen.</p>
                        </div>
                    ) : transferActive ? (
                        <div className="w-full h-full p-4 relative">
                            {/* Visualizer replaces logic when active */}
                            <SlidingWindow />
                            <div className="absolute bottom-4 left-0 right-0 text-center text-green-400 animate-pulse font-mono text-sm bg-black/50 py-1 backdrop-blur-md">
                                RECEIVING DATA STREAM...
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-500 blur-xl opacity-20 animate-pulse"></div>
                                <Activity size={64} className="text-green-500 relative z-10 mx-auto mb-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Ready to Receive</h3>
                            <p className="text-gray-400 max-w-sm mx-auto">
                                Server is listening on <span className="text-white font-mono">{localIp}:{port}</span> ({protocol.toUpperCase()})
                            </p>

                            {lastFile && (
                                <div className="mt-8 bg-gray-800/80 p-4 rounded-xl flex items-center gap-4 max-w-sm mx-auto border border-gray-700 backdrop-blur-sm">
                                    <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
                                        <FileText size={24} />
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <p className="text-xs text-gray-500 uppercase font-bold">Last Received</p>
                                        <p className="text-sm font-mono text-white truncate w-full" title={lastFile}>
                                            {lastFile}
                                        </p>
                                    </div>
                                </div>
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
