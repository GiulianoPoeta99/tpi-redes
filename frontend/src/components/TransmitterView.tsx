import type React from 'react';
import { useEffect, useRef, useState } from 'react';
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

  // DnD State
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

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
    setIsDragging(false); // Reset visual state

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const f = e.dataTransfer.files[0];
      const filePath = window.api.getFilePath(f);

      if (filePath) {
        setFile(filePath);
      } else {
        console.error('File object missing path property', f);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      const filePath = window.api.getFilePath(f);
      if (filePath) setFile(filePath);
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
    // biome-ignore lint/a11y/noStaticElementInteractions: DnD zone
    <div
      className="h-full flex flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

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
            <div className="flex gap-2">
              <input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 p-3 rounded-lg text-white mt-1"
                placeholder="e.g. 192.168.1.5"
              />
              <button
                type="button"
                onClick={openScan}
                className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg shadow-lg transition-all mt-1"
                title="Scan Network for Peers"
              >
                🔍
              </button>
            </div>
          </label>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
            Destination Port
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white mt-1"
            />
          </label>
        </div>
      </div>

      {/* Protocol Selector */}
      <div className="mb-8">
        <span className="block text-xs font-bold text-gray-500 mb-2 uppercase">Protocol</span>
        <div className="flex bg-gray-900 p-1 rounded-lg w-1/2">
          {['tcp', 'udp'].map((p) => (
            <button
              type="button"
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
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-all cursor-pointer group w-full text-left
            ${isDragging ? 'bg-blue-900/40 border-blue-400' : 'bg-gray-900/30 border-gray-600 hover:bg-gray-800/50 hover:border-gray-500'}
        `}
      >
        {file ? (
          <div className="text-center w-full">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform mx-auto w-fit">
              📄
            </div>
            <p className="text-xl font-bold text-white break-all max-w-lg mx-auto">
              {file.split('/').pop()}
            </p>
            <p className="text-gray-500 text-sm mt-1">{file}</p>

            {transferring && (
              <>
                {/* biome-ignore lint/a11y/noStaticElementInteractions: Stop propagation */}
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: Stop propagation */}
                <div
                  className="mt-8 w-64 mx-auto"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  role="presentation"
                >
                  <ProgressBar progress={progress} />
                  <p className="text-xs text-blue-400 mt-2 font-mono">{progress.toFixed(1)}%</p>
                </div>
              </>
            )}

            {!transferring && (
              <p className="text-xs text-blue-400 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                Click to change file
              </p>
            )}
          </div>
        ) : (
          <div className="text-center pointer-events-none w-full">
            <p
              className={`font-medium transition-colors ${isDragging ? 'text-blue-300' : 'text-gray-400'}`}
            >
              {isDragging ? 'Drop file here!' : 'Drag & Drop file here'}
            </p>
            <p className="text-gray-600 text-sm mt-1">or click to browse</p>
          </div>
        )}
      </button>

      {/* Action */}
      <div className="mt-6">
        <button
          type="button"
          onClick={sendFile}
          disabled={transferring}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-xl transition-all active:scale-[0.99] disabled:opacity-50 disabled:scale-100"
        >
          {transferring ? 'SENDING...' : 'SEND FILE'}
        </button>
      </div>
    </div>
  );
};

export default TransmitterView;
