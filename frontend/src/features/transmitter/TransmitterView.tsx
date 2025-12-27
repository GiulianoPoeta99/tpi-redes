import { Send } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import StatsModal from '../dashboard/components/StatsModal';
import HeaderStatusCard from '../shared/components/HeaderStatusCard';
import ScanModal from '../shared/components/ScanModal';
import { StorageService } from '../shared/services/StorageService';
import AdvancedOptions from './components/AdvancedOptions';
import FilesQueueModal from './components/FilesQueueModal';
import NetworkConfiguration from './components/NetworkConfiguration';
import PayloadConfiguration from './components/PayloadConfiguration';
import TransferCompleteOverlay from './components/TransferCompleteOverlay';
import TransferProgressOverlay from './components/TransferProgressOverlay';

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

  const isValid = Boolean(ip && port && files.length > 0);

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
          {/* Row 1: Network & Advanced Params */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[320px]">
            {/* Network Config */}
            <NetworkConfiguration
              ip={ip}
              setIp={setIp}
              openScan={openScan}
              status={status}
              port={port}
              setPort={setPort}
              protocol={protocol}
              setProtocol={setProtocol}
              netInterface={netInterface}
              setNetInterface={setNetInterface}
            />

            {/* Advanced Params */}
            <AdvancedOptions
              delay={delay}
              setDelay={setDelay}
              status={status}
              chunkSize={chunkSize}
              setChunkSize={setChunkSize}
            />
          </div>

          {/* Row 2: Payload Selection - Flexible Bottom */}
          <PayloadConfiguration
            files={files}
            addFiles={addFiles}
            setFiles={setFiles}
            setIsQueueOpen={setIsQueueOpen}
            status={status}
            startBatch={startBatch}
            isValid={isValid}
          />
        </div>
      )}

      {/* SHOW SENDING UI if actually sending OR if waiting for next batch file */}
      {(status === 'sending' || (isBatchActive && status === 'completed')) && (
        <TransferProgressOverlay
          progress={progress}
          currentFileIndex={currentFileIndex}
          totalFiles={files.length}
          currentFilename={files[currentFileIndex]?.split('/').pop() || 'Unknown'}
          onCancel={cancelSend}
        />
      )}

      {status === 'completed' && !isBatchActive && (
        <TransferCompleteOverlay
          totalFiles={files.length}
          onShowStats={() => setShowStats(true)}
          onReset={resetForm}
        />
      )}
    </div>
  );
};

export default TransmitterView;
