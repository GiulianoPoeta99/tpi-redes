import { Check, FileText, List, Plus, Search, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import FilesQueueModal from './FilesQueueModal';
import ScanModal from './ScanModal';
import StatsModal from './StatsModal';

const TransmitterView: React.FC<{ setBusy: (busy: boolean) => void }> = ({ setBusy }) => {
  // Config State
  const [ip, setIp] = useState('');
  const [port, setPort] = useState(8080);
  const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [delay, setDelay] = useState(0);

  // File State
  const [files, setFiles] = useState<string[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Transfer State
  const [status, setStatus] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [progress, setProgress] = useState(0); // Current file progress
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isBatchActive, setIsBatchActive] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Discovery
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  // biome-ignore lint/suspicious/noExplicitAny: Discovery peer type
  const [discoveredPeers, setDiscoveredPeers] = useState<any[]>([]);
  const [scanError, setScanError] = useState<string>();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Transfer Stats (Last completed file)
  const [transferStats, setTransferStats] = useState({
    filename: '',
    totalBytes: 0,
    startTime: 0,
    endTime: 0,
    timeTaken: 0,
    throughput: 0,
    protocol: 'TCP',
  });
  const totalBytesRef = useRef(0);

  const isValid = ip && port && files.length > 0;

  useEffect(() => {
    setBusy(status === 'sending');
  }, [status, setBusy]);

  // Handle Python Events
  useEffect(() => {
    const cleanup = window.api.onLog((log: string) => {
      try {
        const json = JSON.parse(log);
        if (json.type === 'TRANSFER_UPDATE') {
          if (json.status === 'start') {
            setStatus('sending');
            setProgress(0);
            setTransferStats((prev) => ({
              ...prev,
              startTime: Date.now(),
              totalBytes: 0,
              timeTaken: 0,
              throughput: 0,
            }));
          } else if (json.status === 'progress') {
            if (json.total > 0) {
              setProgress((json.current / json.total) * 100);
              totalBytesRef.current = json.total;
            }
          } else if (json.status === 'complete') {
            // Calculate final stats for this file
            setTransferStats((prev) => {
              const now = Date.now();
              const duration = (now - prev.startTime) / 1000;
              const bytes = totalBytesRef.current;
              return {
                ...prev,
                filename: json.filename || prev.filename,
                totalBytes: bytes,
                endTime: now,
                timeTaken: duration,
                throughput: duration > 0 ? bytes / duration : 0, // B/s
                protocol: protocol.toUpperCase(),
              };
            });

            // If batch active, we don't set 'completed' yet unless it's the last one
            // Actually we DO set it to trigger the useEffect loop
            setStatus('completed');
            setProgress(100);
          }
        } else if (json.type === 'ERROR') {
          // If error in batch, stop everything? Or continue?
          // Stopping is safer.
          setStatus('idle');
          setIsBatchActive(false);
        }
      } catch (_e) {
        // Ignore
      }
    });
    return cleanup;
  }, [protocol]);

  const sendSingleFile = useCallback(
    async (filePath: string) => {
      setStatus('sending'); // Resets status from 'completed' -> 'sending'
      setTransferStats((prev) => ({ ...prev, startTime: Date.now() }));
      try {
        await window.api.sendFile({
          file: filePath,
          ip,
          port,
          protocol,
          sniff: true,
          delay: delay / 1000,
        });
      } catch (e) {
        console.error(e);
        setStatus('idle');
        setIsBatchActive(false);
      }
    },
    [ip, port, protocol, delay],
  );

  // Batch Loop Logic
  useEffect(() => {
    if (isBatchActive && status === 'completed') {
      if (currentFileIndex < files.length - 1) {
        // Process next file
        const nextIndex = currentFileIndex + 1;
        setCurrentFileIndex(nextIndex); // Update UI
        setStatus('sending'); // Prevent race condition double-trigger
        setProgress(0); // Reset visual progress

        // Non-blocking timeout to allow render cycle updates
        setTimeout(() => {
          sendSingleFile(files[nextIndex]);
        }, 500);
      } else {
        // Batch finished
        setIsBatchActive(false);
        // Leave status as completed to show Success screen
      }
    }
  }, [status, isBatchActive, currentFileIndex, files, sendSingleFile]);

  const startBatch = () => {
    if (!isValid) return;
    setIsBatchActive(true);
    setCurrentFileIndex(0);
    sendSingleFile(files[0]);
  };

  const cancelSend = async () => {
    try {
      await window.api.stopProcess();
      setStatus('idle');
      setIsBatchActive(false);
    } catch (e) {
      console.error(e);
      setStatus('idle');
    }
  };

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

  const addFiles = (newFiles: string[]) => {
    // Prevent duplicates? logic:
    const unique = newFiles.filter((f) => !files.includes(f));
    setFiles((prev) => [...prev, ...unique]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const paths = Array.from(e.target.files)
        .map((f) => window.api.getFilePath(f))
        .filter(Boolean) as string[];
      addFiles(paths);
    }
    // fileInputRef.current.value = ""; // Reset to allow re-selecting same file
  };

  const resetForm = () => {
    setStatus('idle');
    setProgress(0);
    setCurrentFileIndex(0);
    // Don't clear files? consistent with "send another"
  };

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Outer circle for batch
  const outerRadius = 80;
  const outerCircumference = 2 * Math.PI * outerRadius;
  // If we are sending file 0, complete 0. If sending 1 (so 0 done), complete 1.
  // We can refine batch percent:
  // (currentFileIndex + progress/100) / files.length * 100
  const smoothBatchPercent = ((currentFileIndex + progress / 100) / files.length) * 100;
  const outerStrokeDashoffset =
    outerCircumference - (smoothBatchPercent / 100) * outerCircumference;

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} stats={transferStats} />
      <FilesQueueModal
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        files={files}
        onRemove={(i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
      />

      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />
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
        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto pb-6 px-1">
          {/* FORM */}
          <div className="grid grid-cols-2 gap-6 mb-6 mt-1">
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

          <div className="mb-6">
            <label
              htmlFor="delay-slider"
              className="block text-xs font-bold text-gray-500 mb-2 uppercase flex justify-between"
            >
              <span>Transmission Delay</span>
              <span className="text-blue-400">{delay} ms</span>
            </label>
            <input
              id="delay-slider"
              type="range"
              min="0"
              max="1000"
              step="10"
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer border border-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1 font-mono">
              <span>0ms (Fastest)</span>
              <span>1000ms (Slow)</span>
            </div>
          </div>

          {/* DROP ZONE */}
          {/* biome-ignore lint/a11y/useSemanticElements: Cannot use button because it contains nested buttons */}
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (files.length === 0) fileInputRef.current?.click();
              }
            }}
            onClick={() => files.length === 0 && fileInputRef.current?.click()}
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
              const paths = Array.from(e.dataTransfer.files)
                .map((f) => window.api.getFilePath(f))
                .filter(Boolean) as string[];
              addFiles(paths);
            }}
            className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-all group min-h-[160px] relative cursor-pointer
                        ${isDragging ? 'bg-blue-900/20 border-blue-500' : 'bg-gray-900/20 border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'}
                    `}
          >
            {files.length > 0 ? (
              <div className="text-center w-full">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2 text-blue-400 group-hover:scale-110 transition-transform">
                  <FileText size={24} />
                </div>
                <p className="font-medium text-white text-lg">
                  {files.length} {files.length === 1 ? 'file' : 'files'} selected
                </p>
                <div className="flex justify-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsQueueOpen(true);
                    }}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-xs font-medium text-gray-200 flex items-center gap-2 transition-colors cursor-pointer border-none"
                  >
                    <List size={14} /> View List
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 rounded-md text-xs font-medium text-blue-300 flex items-center gap-2 transition-colors cursor-pointer border-none"
                  >
                    <Plus size={14} /> Add More
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFiles([]);
                    }}
                    className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 rounded-md text-xs font-medium text-red-300 flex items-center gap-2 transition-colors cursor-pointer border-none"
                  >
                    <X size={14} /> Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 mb-1 text-sm">Drag & Drop files here</p>
                <p className="text-[10px] text-gray-600">or click to browse</p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={startBatch}
              disabled={!isValid}
              className={`w-full py-4 font-bold rounded-xl shadow-xl transition-all
                            ${
                              isValid
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.01] hover:shadow-blue-900/20 text-white'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            }
                        `}
            >
              SEND {files.length > 0 ? `${files.length} FILES` : 'FILES'}
            </button>
          </div>
        </div>
      )}

      {status === 'sending' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-10 animate-in fade-in zoom-in duration-300">
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Outer Circle (Batch) */}
            <svg
              className="absolute inset-0 w-full h-full transform -rotate-90"
              aria-label="Batch Progress"
              role="img"
            >
              <title>Batch Progress</title>
              <circle
                cx="128"
                cy="128"
                r={outerRadius}
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                className="text-gray-800"
              />
              <circle
                cx="128"
                cy="128"
                r={outerRadius}
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={outerCircumference}
                strokeDashoffset={outerStrokeDashoffset}
                strokeLinecap="round"
                className="text-purple-500 transition-all duration-300 ease-linear"
              />
            </svg>

            {/* Inner Circle (File) */}
            <div className="relative w-32 h-32">
              <svg
                className="w-full h-full transform -rotate-90"
                aria-label="File Progress"
                role="img"
              >
                <title>File Progress</title>
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-800"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="text-blue-500 transition-all duration-300 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold font-mono text-white">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-blue-300 animate-pulse font-medium tracking-wide mb-1">
              SENDING FILE {currentFileIndex + 1} OF {files.length}
            </p>
            <p className="text-sm text-gray-400 font-mono truncate max-w-xs mx-auto">
              {files[currentFileIndex]?.split('/').pop()}
            </p>

            <div className="mt-2 text-xs text-purple-400 font-mono">
              Batch Progress: {Math.round(smoothBatchPercent)}%
            </div>
          </div>

          <button
            type="button"
            onClick={cancelSend}
            className="mt-8 px-6 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/50 rounded-lg font-bold transition-all text-sm uppercase tracking-wide hover:scale-105"
          >
            Cancel Batch
          </button>
        </div>
      )}

      {status === 'completed' && !isBatchActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50 backdrop-blur-sm z-10 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30 mb-6 animate-bounce">
            <Check size={48} className="text-white box-content" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Batch Complete!</h2>
          <p className="text-gray-400 mb-8">All {files.length} files transferred successfully.</p>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setShowStats(true)}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors border border-gray-700"
            >
              Last File Stats
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
            >
              Send More
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransmitterView;
