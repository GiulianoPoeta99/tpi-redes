import type React from 'react';
import { useEffect, useState } from 'react';
import ProgressBar from './ProgressBar';
import SlidingWindow from './SlidingWindow';
import ToastContainer, { type ToastMessage } from './Toast';

const TransferView: React.FC = () => {
  const [mode, setMode] = useState<'server' | 'client'>('server');
  const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [port, setPort] = useState(8080);
  const [ip, setIp] = useState('127.0.0.1');
  const [file, setFile] = useState('');
  const [sniff] = useState(false); // Sniffer disabled by default in simple UI

  // UI State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [transferState, setTransferState] = useState<{
    active: boolean;
    filename: string;
    current: number;
    total: number;
    status: string;
  }>({ active: false, filename: '', current: 0, total: 0, status: '' });

  const [isScanning, setIsScanning] = useState(false);
  const [discoveredPeers, setDiscoveredPeers] = useState<
    { hostname: string; ip: string; port: number }[]
  >([]);
  const [showPeers, setShowPeers] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Show visualizer only when transfer is active or connected (server mode)
  const showVisualizer = transferState.active || (mode === 'server' && isConnected);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => {
      // Prevent duplicates (simple check by message type)
      if (prev.some((t) => t.message === message)) return prev;
      return [...prev, { id, type, message }];
    });
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Drag & Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      // @ts-expect-error
      if (droppedFile.path) {
        // @ts-expect-error
        setFile(droppedFile.path);
        setMode('client');
        addToast('info', `File selected: ${droppedFile.name}`);
      }
    }
  };

  // Listen for Backend Events
  useEffect(() => {
    const onLog = (log: string) => {
      try {
        const json = JSON.parse(log);

        if (json.type === 'TRANSFER_UPDATE') {
          if (json.status === 'start') {
            setTransferState({
              active: true,
              filename: json.filename,
              current: 0,
              total: json.total || 0,
              status: 'Starting...',
            });
          } else if (json.status === 'progress') {
            setTransferState((prev) => ({
              ...prev,
              current: json.current,
              total: json.total,
              status: 'Transferring...',
            }));
          } else if (json.status === 'complete') {
            setTransferState((prev) => ({
              ...prev,
              active: false,
              current: prev.total,
              status: 'Completed',
            }));
            addToast('success', `Transfer Complete: ${json.filename}`);
            setIsConnected(false);
          }
        } else if (json.type === 'SERVER_READY') {
          setIsConnected(true);
          addToast('success', `Server started on port ${json.port}`);
        } else if (json.type === 'ERROR') {
          addToast('error', json.message || 'Unknown Error');
          setIsConnected(false);
          setTransferState((prev) => ({ ...prev, active: false, status: 'Error' }));
        }
      } catch (e) {
        // Not JSON or legacy log
        if (log.includes('Connected by')) setIsConnected(true);
      }
    };

    if (window.api) {
      window.api.onLog(onLog);
    }

    // Cleanup function to remove listener (prevent duplicates)
    return () => {
      // NOTE: Electron IPC listeners usually persist, but if we had a removeListener SDK method we'd call it here.
      // Since we rely on window.api which wraps ipcRenderer.on, we might need to ensure backend doesn't double-send
      // or check if we can removeAllListeners if exposed.
      // For now, React StrictMode causes double mount, so ensuring onLog handles idempotency is key,
      // but `ipcRenderer.on` adds a NEW listener every time.
      // Critical Fix: We need `window.api.removeLogListener` or similar, OR we accept that in Dev mode it might double.
      // Ideally: window.api.onLog returns a cleaner.
      // Assuming we can't change preload easily right now, we'll bank on production build handling it better,
      // or ignoring duplicates in addToast (implemented above).
    };
  }, []);

  const handleStartServer = async () => {
    setTransferState((prev) => ({ ...prev, status: 'Starting...' }));
    try {
      await window.api.startServer({
        port,
        protocol,
        saveDir: './received_files',
        sniff,
      });
    } catch (error) {
      addToast('error', `Failed to start server: ${error}`);
    }
  };

  const handleSendFile = async () => {
    if (!file) {
      addToast('error', 'Please select a file first.');
      return;
    }
    setTransferState({
      active: true,
      filename: file.split('/').pop() || 'file',
      current: 0,
      total: 0,
      status: 'Initializing...',
    });
    try {
      await window.api.sendFile({
        file,
        ip,
        port,
        protocol,
        sniff,
      });
    } catch (error) {
      addToast('error', `Failed to send: ${error}`);
      setTransferState((prev) => ({ ...prev, active: false }));
    }
  };

  const handleScanNetwork = async () => {
    setIsScanning(true);
    try {
      const peers = await window.api.scanNetwork();
      setDiscoveredPeers(peers);
      setShowPeers(true);
      if (peers.length === 0) addToast('info', 'No peers found.');
    } catch (error) {
      addToast('error', 'Scan failed.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-900 p-6"
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {dragActive && (
        <div className="absolute inset-0 z-50 bg-blue-600/20 border-4 border-blue-500 border-dashed rounded-xl flex items-center justify-center pointer-events-none backdrop-blur-sm">
          <div className="bg-gray-900 p-6 rounded-xl shadow-2xl border border-blue-500 text-center">
            <h3 className="text-2xl font-bold text-white">Drop File Here</h3>
          </div>
        </div>
      )}

      <div className="w-full max-w-md space-y-6">
        {/* Header / Mode Switcher */}
        <div className="bg-gray-800 p-2 rounded-xl border border-gray-700 flex justify-center shadow-lg">
          <div className="flex bg-gray-900 rounded-lg p-1 w-full">
            <button
              onClick={() => setMode('server')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'server'
                  ? 'bg-gray-700 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Receive (Server)
            </button>
            <button
              onClick={() => setMode('client')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'client'
                  ? 'bg-gray-700 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Send (Client)
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden transition-all duration-300">
          {isConnected && (
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20 animate-pulse">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs font-bold text-green-400">ONLINE</span>
            </div>
          )}

          <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">
            {mode === 'server' ? 'Ready to Receive' : 'Send a File'}
          </h2>

          <div className="space-y-5">
            {/* Protocol */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Protocol
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`cursor-pointer border border-gray-700 rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${protocol === 'tcp' ? 'bg-blue-600/20 border-blue-500' : 'bg-gray-900 hover:border-gray-600'}`}
                >
                  <input
                    type="radio"
                    className="hidden"
                    checked={protocol === 'tcp'}
                    onChange={() => setProtocol('tcp')}
                  />
                  <span
                    className={`text-sm font-medium ${protocol === 'tcp' ? 'text-blue-400' : 'text-gray-400'}`}
                  >
                    TCP
                  </span>
                </label>
                <label
                  className={`cursor-pointer border border-gray-700 rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${protocol === 'udp' ? 'bg-purple-600/20 border-purple-500' : 'bg-gray-900 hover:border-gray-600'}`}
                >
                  <input
                    type="radio"
                    className="hidden"
                    checked={protocol === 'udp'}
                    onChange={() => setProtocol('udp')}
                  />
                  <span
                    className={`text-sm font-medium ${protocol === 'udp' ? 'text-purple-400' : 'text-gray-400'}`}
                  >
                    UDP
                  </span>
                </label>
              </div>
            </div>

            {/* Port (Compact) */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Client Inputs */}
            {mode === 'client' && (
              <div className="space-y-4 animate-slide-down">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                    Destination IP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={ip}
                      onChange={(e) => setIp(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                      placeholder="127.0.0.1"
                    />
                    <button
                      onClick={handleScanNetwork}
                      disabled={isScanning}
                      className="absolute right-2 top-2 p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {isScanning ? '...' : '🔍'}
                    </button>

                    {showPeers && discoveredPeers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                        {discoveredPeers.map((peer, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setIp(peer.ip);
                              setPort(peer.port);
                              setShowPeers(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-gray-200 border-b border-gray-700 last:border-0"
                          >
                            <span className="font-bold">{peer.hostname}</span>{' '}
                            <span className="opacity-70 text-xs">({peer.ip})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                    File
                  </label>
                  <input
                    type="text"
                    value={file}
                    onChange={(e) => setFile(e.target.value)}
                    placeholder="Drag & Drop or type path"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <button
              onClick={mode === 'server' ? handleStartServer : handleSendFile}
              disabled={transferState.active && mode === 'client'}
              className={`w-full font-bold py-4 rounded-xl shadow-lg transform transition-all hover:translate-y-[-2px] active:translate-y-[0px] ${
                mode === 'server'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {mode === 'server' ? (isConnected ? 'Server Running' : 'Start Server') : 'Send File'}
            </button>
          </div>
        </div>

        {/* Active Transfer / Visualizer Panel (Conditional) */}
        {showVisualizer && (
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-300">Live Transfer</h3>
              <span className="text-xs text-gray-500">{transferState.filename}</span>
            </div>

            {transferState.total > 0 && (
              <ProgressBar
                progress={(transferState.current / transferState.total) * 100}
                color={mode === 'server' ? 'emerald' : 'blue'}
              />
            )}

            <div className="h-48 rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
              <SlidingWindow />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransferView;
