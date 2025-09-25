import type React from 'react';
import { useEffect, useState } from 'react';
import ProgressBar from './ProgressBar';
import ScanModal from './ScanModal';

const TransmitterView: React.FC = () => {
  const [ip, setIp] = useState('127.0.0.1');
  const [port, setPort] = useState(8080);
  const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [file, setFile] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [progress, setProgress] = useState(0);

  // Modal State
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredPeers, setDiscoveredPeers] = useState<any[]>([]);
  const [scanError, setScanError] = useState<string>();

  useEffect(() => {
    // Local listener for Progress only
    const cleanup = window.api.onLog((log: string) => {
      try {
        const json = JSON.parse(log);
        if (json.type === 'TRANSFER_UPDATE') {
          if (json.status === 'start') {
            setTransferring(true);
            setProgress(0);
          } else if (json.status === 'progress') {
            if (json.total > 0) setProgress((json.current / json.total) * 100);
          } else if (json.status === 'complete') {
            setTransferring(false);
            setProgress(100);
            // Toast handled by Dashboard
          }
        } else if (json.type === 'ERROR') {
          setTransferring(false);
          // Toast handled by Dashboard
        }
      } catch (e) {}
    });
    return cleanup;
  }, []);

  const openScan = async () => {
    setIsScanOpen(true);
    setIsScanning(true);
    setScanError(undefined);
    setDiscoveredPeers([]);

    try {
      const peers = await window.api.scanNetwork();
      setDiscoveredPeers(peers || []);
    } catch (e: any) {
      console.error('Scan failed', e);
      setScanError(e.toString());
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectPeer = (peer: any) => {
    setIp(peer.ip);
    if (peer.port) setPort(peer.port);
    setIsScanOpen(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) {
      // @ts-expect-error
      const path = e.dataTransfer.files[0].path;
      if (path) {
        setFile(path);
      }
    }
  };

  const sendFile = async () => {
    if (!file) return;
    try {
      await window.api.sendFile({ file, ip, port, protocol, sniff: true });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="h-full flex flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <ScanModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onSelect={handleSelectPeer}
        scanning={isScanning}
        peers={discoveredPeers}
        error={scanError}
      />

      {/* Config Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
            Destination IP
          </label>
          <div className="flex gap-2">
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 p-3 rounded-lg text-white"
              placeholder="e.g. 192.168.1.5"
            />
            <button
              onClick={openScan}
              className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg shadow-lg transition-all"
              title="Scan Network for Peers"
            >
              🔍
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
            Destination Port
          </label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white"
          />
        </div>
      </div>

      {/* Protocol Selector */}
      <div className="mb-8">
        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Protocol</label>
        <div className="flex bg-gray-900 p-1 rounded-lg w-1/2">
          {['tcp', 'udp'].map((p) => (
            <button
              key={p}
              onClick={() => setProtocol(p as any)}
              className={`flex-1 py-1.5 text-sm rounded ${protocol === p ? 'bg-purple-600 text-white shadow' : 'text-gray-400'}`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* File Area */}
      <div className="flex-1 bg-gray-900/30 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center p-8 transition-colors hover:bg-gray-800/50 hover:border-gray-500">
        {file ? (
          <div className="text-center">
            <div className="text-5xl mb-4">📄</div>
            <p className="text-xl font-bold text-white break-all max-w-lg">
              {file.split('/').pop()}
            </p>
            <p className="text-gray-500 text-sm mt-1">{file}</p>

            {transferring && (
              <div className="mt-8 w-64 mx-auto">
                <ProgressBar progress={progress} />
                <p className="text-xs text-blue-400 mt-2 font-mono">{progress.toFixed(1)}%</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center pointer-events-none">
            <p className="text-gray-400 font-medium">Drag & Drop file here</p>
            <p className="text-gray-600 text-sm mt-1">or use the input below (if implemented)</p>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="mt-6">
        <button
          onClick={sendFile}
          disabled={transferring}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-xl transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100"
        >
          {transferring ? 'SENDING...' : 'SEND FILE'}
        </button>
      </div>
    </div>
  );
};

export default TransmitterView;
