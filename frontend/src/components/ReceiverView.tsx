import type React from 'react';
import { useEffect, useState } from 'react';
import { StorageService } from '../services/StorageService';
import SlidingWindow from './SlidingWindow';

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
  }, [setBusy]);

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
    <div className="h-full flex flex-col relative">
      {/* Control Bar */}
      <div className="flex items-end gap-4 mb-8">
        <div className="flex-1">
          <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Protocol
          </span>
          <div className="flex bg-gray-900 rounded-lg p-1">
            {['tcp', 'udp'].map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setProtocol(p as 'tcp' | 'udp')}
                className={`flex-1 py-2 text-sm rounded ${protocol === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Port
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none mt-1"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={toggleServer}
          className={`flex-1 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all ${isConnected ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500 hover:-translate-y-0.5'}`}
        >
          {isConnected ? 'STOP SERVER' : 'START SERVER'}
        </button>
      </div>

      {/* Main Visual / Status Area */}
      <div className="flex-1 bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center relative overflow-hidden">
        {!isConnected ? (
          <div className="text-center text-gray-500">
            <svg
              aria-hidden="true"
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              ></path>
            </svg>
            <p className="text-lg font-medium">Server is Offline</p>
            <p className="text-sm opacity-70">Configure settings above and click Start.</p>

            <div className="mt-6 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg inline-block">
              <span className="text-gray-500 text-xs font-bold uppercase mr-2">Machine IP:</span>
              <span className="text-gray-300 font-mono font-bold">{localIp}</span>
            </div>
          </div>
        ) : transferActive ? (
          <div className="w-full h-full p-4 relative">
            {/* Visualizer replaces logic when active */}
            <SlidingWindow />
            <div className="absolute bottom-4 left-0 right-0 text-center text-blue-400 animate-pulse font-mono text-sm">
              RECEIVING DATA...
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-green-500 animate-pulse mb-6">
              <svg
                aria-hidden="true"
                className="w-20 h-20 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Ready to Receive</h3>
            <p className="text-gray-400">Listening for incoming connections...</p>

            <div className="mt-4 px-4 py-2 bg-blue-900/20 border border-blue-500/30 rounded-lg inline-block">
              <span className="text-blue-400 text-xs font-bold uppercase mr-2">
                Your IP Address:
              </span>
              <span className="text-white font-mono font-bold">{localIp}</span>
            </div>

            {lastFile && (
              <div className="mt-8 bg-gray-800 p-4 rounded-lg flex items-center justify-between gap-4 max-w-sm mx-auto border border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-900/30 rounded text-green-400">📄</div>
                  <div className="text-left">
                    <p className="text-xs text-gray-500 uppercase font-bold">Last Received:</p>
                    <p className="text-sm font-mono text-white truncate max-w-[150px]">
                      {lastFile}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiverView;
