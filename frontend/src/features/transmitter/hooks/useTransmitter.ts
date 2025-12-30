import { useEffect, useRef, useState } from 'react';
import { CHUNK_SIZE, DEFAULT_SERVER_PORT } from '../../../config/constants';
import { StorageService } from '../../shared/services/StorageService';
import type { SessionItem, TransferStats, TransferStatus } from '../types';

/**
 * Props for useTransmitter hook.
 */
interface UseTransmitterProps {
  setBusy: (busy: boolean) => void;
  addToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

/**
 * Hook managing the file transmission logic.
 * Handles configuration, file selection, batch processing, and IPC events from the backend.
 *
 * @param props - setBusy callback and toast notifier.
 */
export const useTransmitter = ({ setBusy, addToast }: UseTransmitterProps) => {
  const [ip, setIp] = useState('');
  const [port, setPort] = useState<number | string>(DEFAULT_SERVER_PORT);
  const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [delay, setDelay] = useState(0);
  const [chunkSize, setChunkSize] = useState(CHUNK_SIZE);
  const [netInterface, setNetInterface] = useState<string | null>(null);

  const [files, setFiles] = useState<string[]>([]);

  const [status, setStatus] = useState<TransferStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isBatchActive, setIsBatchActive] = useState(false);

  const [transferStats, setTransferStats] = useState<TransferStats>({
    filename: '',
    totalBytes: 0,
    startTime: 0,
    endTime: 0,
    timeTaken: 0,
    throughput: 0,
    protocol: 'TCP',
  });
  const totalBytesRef = useRef(0);

  const [sessionHistory, setSessionHistory] = useState<SessionItem[]>([]);

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

              if (event.filename) {
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

              setProgress(100);

              currentFileIndexRef.current += 1;

              if (currentFileIndexRef.current >= totalBatchFilesRef.current) {
                setStatus('completed');
                setProgress(100);
                addToast('info', 'Batch Complete', `${totalBatchFilesRef.current} files sent.`);
                setIsBatchActive(false);
              } else {
              }
            }
          } else if (event.type === 'ERROR') {
            setStatus('idle');
            setIsBatchActive(false);
            addToast('error', 'Transfer Error', event.message || 'Transfer failed');
          }
        });
      } catch (_e) {}
    });
    return cleanup;
  }, [protocol, addToast, files]);

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

      if (files[currentFileIndex]) {
        StorageService.addHistoryItem({
          id: Date.now().toString() + Math.random(),
          timestamp: Date.now(),
          filename: files[currentFileIndex].split('/').pop() || 'unknown',
          size: totalBytesRef.current,
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

  const addFiles = (newFiles: string[]) => {
    const unique = newFiles.filter((f) => !files.includes(f));
    setFiles((prev) => [...prev, ...unique]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const resetForm = () => {
    setStatus('idle');
    setProgress(0);
    setCurrentFileIndex(0);
  };

  return {
    state: {
      ip,
      port,
      protocol,
      delay,
      chunkSize,
      netInterface,
      files,
      status,
      progress,
      currentFileIndex,
      isBatchActive,
      transferStats,
      sessionHistory,
      isValid,
    },
    actions: {
      setIp,
      setPort,
      setProtocol,
      setDelay,
      setChunkSize,
      setNetInterface,
      setFiles,
      addFiles,
      removeFile,
      startBatch,
      cancelSend,
      resetForm,
    },
  };
};
