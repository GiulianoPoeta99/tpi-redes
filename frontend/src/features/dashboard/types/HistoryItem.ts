/**
 * Represents a historical data point for throughput.
 *
 * @property timestamp - Timestamp of the event.
 * @property filename - Name of the file transferred.
 * @property throughput - Throughput achieved in bytes/sec.
 * @property size - Size of the file in bytes.
 * @property duration - Duration of transfer in milliseconds.
 */
export interface HistoryItem {
  timestamp: number;
  filename: string;
  throughput: number;
  size: number;
  duration?: number;
}
