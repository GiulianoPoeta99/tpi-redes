/**
 * Represents statistics for a single file transfer.
 *
 * @property filename - Name of the file.
 * @property timeTaken - Time taken in seconds.
 * @property throughput - Throughput in MB/s.
 * @property protocol - Protocol used (e.g., 'tcp', 'udp').
 */
export interface TransferStats {
  filename: string;
  timeTaken: number;
  throughput: number;
  protocol: string;
}
