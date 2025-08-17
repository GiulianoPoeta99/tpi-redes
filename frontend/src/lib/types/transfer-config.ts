// Transfer configuration types and validation

export type Protocol = 'Tcp' | 'Udp';
export type TransferMode = 'Transmitter' | 'Receiver';

export interface TransferConfig {
  mode: TransferMode;
  protocol: Protocol;
  target_ip?: string;
  port: number;
  filename?: string;
  chunk_size: number;
  timeout: number; // Duration in seconds (will be converted to Duration in backend)
}

export const defaultTransferConfig: TransferConfig = {
  mode: 'Transmitter',
  protocol: 'Tcp',
  target_ip: undefined,
  port: 8080,
  filename: undefined,
  chunk_size: 8192,
  timeout: 30,
};