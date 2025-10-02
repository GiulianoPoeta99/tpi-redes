import { Check, FileText, Search } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import ScanModal from './ScanModal';
import StatsModal from './StatsModal';

const TransmitterView: React.FC = () => {
  // Config State
  const [ip, setIp] = useState('');
  const [port, setPort] = useState(8080);
  const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [file, setFile] = useState('');

  // Transfer State
  const [status, setStatus] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [progress, setProgress] = useState(0);

  // Stats State
  const [startTime, setStartTime] = useState<number>(0);
  const [transferStats, setTransferStats] = useState({
    filename: '',
    totalBytes: 0,
    timeTaken: 0,
    throughput: 0,
    protocol: 'tcp',
  });
  const [showStats, setShowStats] = useState(false);

  // Modal State
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredPeers, setDiscoveredPeers] = useState<any[]>([]);
  const [scanError, setScanError] = useState<string>();

  // DnD State
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValid = ip && port && file;

  useEffect(() => {
    const cleanup = window.api.onLog((log: string) => {
      try {
        const json = JSON.parse(log);
        if (json.type === 'TRANSFER_UPDATE') {
          if (json.status === 'start') {
            setStatus('sending');
            setProgress(0);
            setStartTime(Date.now());
          } else if (json.status === 'progress') {
            if (json.total > 0) setProgress((json.current / json.total) * 100);
          } else if (json.status === 'complete') {
            const endT = Date.now();
            const durationSec = (endT - startTime) / 1000 || 0.1; // Avoid div by zero
            // Update stats
            setTransferStats({
              filename: json.filename,
              totalBytes: 0, // We miss total bytes in complete event? 'progress' has it.
              // We can cache it from progress or just assume file size if we had it.
              // Let's use a ref or state for bytes if needed, but for now I'll check if 'complete' has it
              // Checks backend: {"type": "TRANSFER_UPDATE", "status": "complete", "filename": ...}
              // It lacks size. I should store size from start/progress.
              // I'll grab it from file state if possible or previous progress update.
              // Doing a lazy calc: throughput = file_size / duration.
              // But I don't have file size easily in 'complete' event.
              // I'll use a hack: I can't easily get it unless I stored it.
              // Let's rely on 'progress' event updating a ref.
              timeTaken: durationSec,
              throughput: 0, // Will calc below in render or effect?
              // Actually safer to calc here if I had size.
              protocol: protocol,
            });
            setStatus('completed');
            setProgress(100);
          }
        } else if (json.type === 'ERROR') {
          setStatus('idle');
        }
      } catch (_e) {}
    });
    return cleanup;
  }, [startTime, protocol]);

  // Keep track of total bytes from progress updates to populate stats
  const totalBytesRef = useRef(0);
  useEffect(() => {
    if (status === 'sending' && progress > 0) {
      // It's hard to get exact bytes seamlessly without ref from onLog.
      // Re-implementing onLog inside useEffect above is better to close over totalBytesRef.
      // But I separated them. Let's fix this by merging logic or using a ref that onLog writes to.
    }
  }, [status, progress]);

  // Better: Re-define onLog to capture bytes
  useEffect(() => {
    const cleanup = window.api.onLog((log: string) => {
      try {
        const json = JSON.parse(log);
        if (json.type === 'TRANSFER_UPDATE') {
          if (json.status === 'progress') {
            totalBytesRef.current = json.total;
            if (json.total > 0) setProgress((json.current / json.total) * 100);
          } else if (json.status === 'complete') {
            setStatus('completed');
            setProgress(100);
            const duration = (Date.now() - startTime) / 1000;
            setTransferStats((prev) => ({
              ...prev,
              filename: json.filename,
              totalBytes: totalBytesRef.current,
              timeTaken: duration,
              throughput: duration > 0 ? totalBytesRef.current / 1024 / 1024 / duration : 0,
              protocol,
            }));
          }
        }
      } catch (_e) {}
    });
    return cleanup;
  }, [startTime, protocol]);

  const openScan = async () => {
    setIsScanOpen(true);
    setIsScanning(true);
    setScanError(undefined);
    setDiscoveredPeers([]);
    try {
      const peers = await window.api.scanNetwork();
      setDiscoveredPeers(peers || []);
    } catch (e: any) {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      const filePath = window.api.getFilePath(f);
      if (filePath) setFile(filePath);
    }
  };

  const resetForm = () => {
    setStatus('idle');
    setProgress(0);
    // Keep IP/Port/File for convenience? User said "volver a enviar".
    // "para que el formulario vuelva al estado original".
    // Usually implies "ready to send again". keeping data is friendly.
  };

  const sendFile = async () => {
    if (!isValid) return;
    setStatus('sending');
    setStartTime(Date.now());
    try {
      await window.api.sendFile({ file, ip, port, protocol, sniff: true });
    } catch (e) {
      console.error(e);
      setStatus('idle');
    }
  };

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} stats={transferStats} />

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
      <ScanModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onSelect={handleSelectPeer}
        scanning={isScanning}
        peers={discoveredPeers}
        error={scanError}
      />

      {/* CONTENT SWITCHER */}
      {status === 'idle' && (
        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* FORM */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                Destination IP
                <div className="flex gap-2 mt-1">
                  <input
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-700 p-3 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. 192.168.1.5"
                  />
                  <button
                    type="button"
                    onClick={openScan}
                    className="bg-gray-800 hover:bg-gray-700 text-blue-400 p-3 rounded-lg border border-gray-700 transition-colors"
                  >
                    <Search size={20} />
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
                  className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all mt-1"
                />
              </label>
            </div>
          </div>

          <div className="mb-6">
            <span className="block text-xs font-bold text-gray-500 mb-2 uppercase">Protocol</span>
            <div className="flex bg-gray-900 p-1 rounded-lg w-1/2">
              {['tcp', 'udp'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProtocol(p as any)}
                  className={`flex-1 py-1.5 text-sm rounded font-medium transition-all ${
                    protocol === p
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files[0];
              const p = window.api.getFilePath(f);
              if (p) setFile(p);
            }}
            className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-all group
                        ${isDragging ? 'bg-blue-900/20 border-blue-500' : 'bg-gray-900/20 border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'}
                    `}
          >
            {file ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-400 group-hover:scale-110 transition-transform">
                  <FileText size={32} />
                </div>
                <p className="font-medium text-white break-all max-w-sm mx-auto">
                  {file.split('/').pop()}
                </p>
                <p className="text-xs text-gray-500 mt-1">{file}</p>
                <p className="text-xs text-blue-400 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  Change File
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 mb-2">Drag & Drop file here</p>
                <p className="text-xs text-gray-600">or click to browse</p>
              </div>
            )}
          </button>

          <div className="mt-6">
            <button
              type="button"
              onClick={sendFile}
              disabled={!isValid}
              className={`w-full py-4 font-bold rounded-xl shadow-xl transition-all
                            ${
                              isValid
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.01] hover:shadow-blue-900/20 text-white'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            }
                        `}
            >
              SEND FILE
            </button>
          </div>
        </div>
      )}

      {status === 'sending' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50 backdrop-blur-sm z-10 animate-in fade-in zoom-in duration-300">
          <div className="relative w-40 h-40">
            <svg
              className="w-full h-full transform -rotate-90"
              aria-label="Transfer Progress"
              role="img"
            >
              <title>Transfer Progress</title>
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-800"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent" // Removed transparent fill, circle is just stroke
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="text-blue-500 transition-all duration-300 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold font-mono text-white">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          <p className="mt-8 text-blue-300 animate-pulse font-medium tracking-wide">
            SENDING FILE...
          </p>
          <p className="md:text-sm text-xs text-gray-500 mt-2">{file.split('/').pop()}</p>
        </div>
      )}

      {status === 'completed' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50 backdrop-blur-sm z-10 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30 mb-6 animate-bounce">
            <Check size={48} className="text-white box-content" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Success!</h2>
          <p className="text-gray-400 mb-8">File transferred successfully.</p>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setShowStats(true)}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors border border-gray-700"
            >
              View Stats
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
            >
              Send Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransmitterView;
