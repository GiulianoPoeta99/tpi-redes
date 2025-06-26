// TypeScript interfaces matching backend types

export interface TransferProgress {
  transferId: string;
  progress: number;        // 0.0 - 1.0
  speed: number;           // bytes per second
  eta: number;             // seconds remaining
  status: 'idle' | 'connecting' | 'transferring' | 'completed' | 'error';
  error?: string;
}

export interface TransferConfig {
  mode: 'transmitter' | 'receiver';
  protocol: 'tcp' | 'udp';
  targetIp?: string;
  port: number;
  filename?: string;
  chunkSize: number;
  timeout: number;
}

export interface TransferRecord {
  id: string;
  filename: string;
  size: number;
  mode: 'sent' | 'received';
  protocol: 'tcp' | 'udp';
  target: string;
  status: 'completed' | 'failed' | 'cancelled';
  timestamp: Date;
  duration: number;
  checksum: string;
  error?: string;
}

export interface TransferResult {
  success: boolean;
  transferId: string;
  bytesTransferred: number;
  duration: number;
  checksum: string;
  error?: string;
}

export class TransferError extends Error {
  constructor(
    message: string,
    public code: string,
    public transferId?: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'TransferError';
  }
}