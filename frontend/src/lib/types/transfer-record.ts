// Transfer record and result types

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