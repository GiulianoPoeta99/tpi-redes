// Transfer progress interface matching backend types

export interface TransferProgress {
  transfer_id: string;
  progress: number;        // 0.0 - 1.0
  speed: number;           // bytes per second
  eta: number;             // seconds remaining
  status: TransferStatus;
  error?: string;
  bytes_transferred: number;
  total_bytes: number;
}

export type TransferStatus = 'Idle' | 'Connecting' | 'Transferring' | 'Completed' | 'Error' | 'Cancelled';