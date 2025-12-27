export type TransferStatus = 'idle' | 'sending' | 'completed';

export interface TransferStats {
  filename: string;
  totalBytes: number;
  startTime: number;
  endTime: number;
  timeTaken: number;
  throughput: number;
  protocol: string;
}

export interface SessionItem {
  timestamp: number;
  filename: string;
  throughput: number;
  size: number;
  duration: number;
}
