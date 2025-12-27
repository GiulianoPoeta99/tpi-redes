import { Check, FileText, Send, Settings } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import StatsModal from '../dashboard/components/StatsModal';
import ConfigGroup from '../shared/components/ConfigGroup';
import HeaderStatusCard from '../shared/components/HeaderStatusCard';
import PortProtocolConfig from '../shared/components/PortProtocolConfig';
import ScanModal from '../shared/components/ScanModal';
import SubmitButton from '../shared/components/SubmitButton';
import { StorageService } from '../shared/services/StorageService';
import ChunkSizeConfig from './components/ChunkSizeConfig';
import DelayConfig from './components/DelayConfig';
import FileSelectionConfig from './components/FileSelectionConfig';
import FilesQueueModal from './components/FilesQueueModal';
import TargetConfig from './components/TargetConfig';

interface TransmitterViewProps {
  setBusy: (busy: boolean) => void;
  addToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
  setHeaderContent: (content: React.ReactNode) => void;
}

const TransmitterView: React.FC<TransmitterViewProps> = ({
  setBusy,
  addToast,
  setHeaderContent,
}) => {
  // Config State
  const [ip, setIp] = useState('');
  const [port, setPort] = useState<number | string>(8080);
  const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [delay, setDelay] = useState(0);
  const [chunkSize, setChunkSize] = useState(4096);
  const [netInterface, setNetInterface] = useState<string | null>(null);

  // File State
  const [files, setFiles] = useState<string[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Transfer State
  const [status, setStatus] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [progress, setProgress] = useState(0); // Current file progress
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isBatchActive, setIsBatchActive] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Lift Header Content
  useEffect(() => {
    setHeaderContent(
      <HeaderStatusCard
        title="Transmitter Mode"
        subtitle="Send Files to Node"
        icon={Send}
        variant="blue"
        status={status === 'sending' ? 'active' : 'idle'}
        statusLabel={status === 'sending' ? 'TRANSMITTING' : 'IDLE'}
      />,
    );
    return () => setHeaderContent(null);
  }, [status, setHeaderContent]);

  // Discovery
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredPeers, setDiscoveredPeers] = useState<{ ip: string; port?: number }[]>([]);
  const [scanError, setScanError] = useState<string>();

  // Stats
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

  // Session Stats
  const [sessionHistory, setSessionHistory] = useState<
    {
      timestamp: number;
      filename: string;
      throughput: number;
      size: number;
      duration: number;
    }[]
  >([]);

  // Batch Stats Tracking
  const batchStatsRef = useRef({
    startTime: 0,
    totalBytes: 0,
  });
  const startTimeRef = useRef(0);
  const currentFileIndexRef = useRef(0);
  const totalBatchFilesRef = useRef(0);

  const isValid = ip && port && files.length > 0;

  useEffect(() => {
    setBusy(status === 'sending' || isBatchActive);
  }, [status, isBatchActive, setBusy]);

  // Handle Python Events
  useEffect(() => {
    const cleanup = window.api.onLog((log: string) => {
      try {
        const parsed = JSON.parse(log);
        const events = Array.isArray(parsed) ? parsed : [parsed];

        events.forEach((json: unknown) => {
          if (typeof json !== 'object' || json === null) return;
          const event = json as {
            type?: string;
            status?: string;
            total?: number;
            current?: number;
            filename?: string;
            message?: string;
          };

          if (event.type === 'TRANSFER_UPDATE') {
            if (event.status === 'start') {
              startTimeRef.current = Date.now();
              setStatus('sending');
              setProgress(0);

              // Sync React State index for display
              if (event.filename) {
                // Find index by matching filename suffix
                const idx = files.findIndex((f) => f.endsWith(event.filename || ''));
                if (idx !== -1) setCurrentFileIndex(idx);
              }

              setTransferStats((prev) => ({
                ...prev,
                startTime: startTimeRef.current,
                totalBytes: 0,
                timeTaken: 0,
                throughput: 0,
              }));
            } else if (event.status === 'progress') {
              if (event.total && event.total > 0 && event.current !== undefined) {
                setProgress((event.current / event.total) * 100);
                totalBytesRef.current = event.total;
              }
            } else if (event.status === 'complete') {
              // Calculate final stats for this file
              const now = Date.now();
              const bytes = totalBytesRef.current;
              const duration = (now - startTimeRef.current) / 1000;
              const throughput = duration > 0 ? bytes / duration : 0;

              StorageService.addHistoryItem({
                id: now.toString() + Math.random(),
                timestamp: now,
                filename: event.filename || 'unknown',
                size: bytes,
                direction: 'sent',
                status: 'success',
                protocol: protocol.toUpperCase(),
              });

              setSessionHistory((prev) => [
                ...prev,
                {
                  timestamp: now,
                  filename: event.filename || 'unknown',
                  throughput,
                  size: bytes,
                  duration,
                },
              ]);

              batchStatsRef.current.totalBytes += bytes;

              setTransferStats((prev) => ({
                ...prev,
                filename: event.filename || prev.filename,
                totalBytes: bytes,
                endTime: now,
                timeTaken: duration,
                throughput: throughput,
                protocol: protocol.toUpperCase(),
              }));

              // Ensure visual completion
              setProgress(100);

              // Advance Batch Ref
              currentFileIndexRef.current += 1;

              // Check if Batch Complete
              if (currentFileIndexRef.current >= totalBatchFilesRef.current) {
                setStatus('completed');
                setProgress(100);
                addToast('info', 'Batch Complete', `${totalBatchFilesRef.current} files sent.`);
                setIsBatchActive(false);
              } else {
                // Remain in 'sending' state
              }
            }
          } else if (event.type === 'ERROR') {
            setStatus('idle');
            setIsBatchActive(false);
            addToast('error', 'Transfer Error', event.message || 'Transfer failed');
          }
        });
      } catch (_e) {
        // Ignore
      }
    });
    return cleanup;
  }, [protocol, addToast, files]);

  // Native Batch Start
  const startBatch = async () => {
    if (!isValid) return;
    setIsBatchActive(true);
    setCurrentFileIndex(0);
    currentFileIndexRef.current = 0;
    totalBatchFilesRef.current = files.length;
    batchStatsRef.current = { startTime: Date.now(), totalBytes: 0 };

    setStatus('sending');
    try {
      await window.api.sendFiles({
        files,
        ip,
        port: Number(port),
        protocol,
        sniff: true,
        delay: delay / 1000,
        chunkSize,
        interface: netInterface,
      });
    } catch (e: unknown) {
      console.error(e);
      setStatus('idle');
      setIsBatchActive(false);
      addToast('error', 'Transfer Error', 'Failed to start batch transfer');
    }
  };

  const cancelSend = async () => {
    try {
      await window.api.stopProcess();

      // Log Cancellation
      if (files[currentFileIndex]) {
        StorageService.addHistoryItem({
          id: Date.now().toString() + Math.random(),
          timestamp: Date.now(),
          filename: files[currentFileIndex].split('/').pop() || 'unknown',
          size: totalBytesRef.current, // Might be 0 if cancelled before first progress
          direction: 'sent',
          status: 'cancelled',
          protocol: protocol.toUpperCase(),
        });
      }

      setStatus('idle');
      setIsBatchActive(false);
      addToast('info', 'Cancelled', 'Transfer cancelled');
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
    } catch (e: unknown) {
      setScanError(String(e));
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectPeer = (peer: { ip: string; port?: number }) => {
    setIp(peer.ip);
    if (peer.port) setPort(peer.port);
    setIsScanOpen(false);
  };

  const addFiles = (newFiles: string[]) => {
    const unique = newFiles.filter((f) => !files.includes(f));
    setFiles((prev) => [...prev, ...unique]);
  };

  const resetForm = () => {
    setStatus('idle');
    setProgress(0);
    setCurrentFileIndex(0);
  };

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const outerRadius = 80;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const smoothBatchPercent = ((currentFileIndex + progress / 100) / files.length) * 100;
  const outerStrokeDashoffset =
    outerCircumference - (smoothBatchPercent / 100) * outerCircumference;

  return (
    <div className="h-full flex flex-col gap-4 relative overflow-hidden">
      <StatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={transferStats}
        history={sessionHistory}
      />
      <FilesQueueModal
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        files={files}
        onRemove={(i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
      />

      <ScanModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onSelect={handleSelectPeer}
        scanning={isScanning}
        peers={discoveredPeers}
        error={scanError}
      />

      {/* MAIN LAYOUT */}
      {status === 'idle' && (
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto pb-2">
          {/* TOP ROW: Config & Advanced */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
            <ConfigGroup title="Network Configuration" icon={Settings} className="h-full">
              <div className="space-y-4">
                <TargetConfig
                  ip={ip}
                  setIp={setIp}
                  onScan={openScan}
                  disabled={status !== 'idle'}
                />

                <PortProtocolConfig
                  port={port}
                  setPort={setPort}
                  protocol={protocol}
                  setProtocol={setProtocol}
                  interfaceVal={netInterface}
                  setInterfaceVal={setNetInterface}
                  disabled={status !== 'idle'}
                />
              </div>
            </ConfigGroup>

            <ConfigGroup title="Advanced Options" icon={Settings} className="h-full">
              <div className="flex flex-col gap-4 h-full">
                <DelayConfig value={delay} onChange={setDelay} disabled={status !== 'idle'} />

                <ChunkSizeConfig
                  value={chunkSize}
                  onChange={setChunkSize}
                  disabled={status !== 'idle'}
                />
              </div>
            </ConfigGroup>
          </div>

          {/* BOTTOM ROW: Payload */}
          <ConfigGroup
            title="Payload Configuration"
            icon={FileText}
            className="flex-1 min-h-[220px] flex flex-col"
          >
            {/* DROP ZONE */}
            {/* FileSelectionConfig should generally not contain nested buttons, check implementation */}
            <FileSelectionConfig
              files={files}
              onFilesAdded={addFiles}
              onFilesCleared={() => setFiles([])}
              onShowQueue={() => setIsQueueOpen(true)}
              disabled={status !== 'idle'}
            />

            <div className="mt-4">
              <SubmitButton
                onClick={startBatch}
                disabled={!isValid}
                variant={isValid ? 'primary' : 'secondary'}
                icon={<Send size={20} />}
              >
                SEND {files.length > 0 ? `${files.length} FILES` : 'FILES'}
              </SubmitButton>
            </div>
          </ConfigGroup>
        </div>
      )}

      {/* SHOW SENDING UI if actually sending OR if waiting for next batch file */}
      {(status === 'sending' || (isBatchActive && status === 'completed')) && (
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
                className="text-mode-tx transition-all duration-300 ease-linear"
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
                  className="text-proto-tcp transition-all duration-300 ease-out"
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
            <p className="text-proto-tcp animate-pulse font-medium tracking-wide mb-1">
              SENDING FILE {currentFileIndex + 1} OF {files.length}
            </p>
            <p className="text-sm text-gray-400 font-mono truncate max-w-xs mx-auto">
              {files[currentFileIndex]?.split('/').pop()}
            </p>

            <div className="mt-2 text-xs text-mode-tx font-mono">
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
