/**
 * Represents the state of the sliding window for flow control visualization.
 *
 * @property base - Sequence number of the window base (oldest unacknowledged byte).
 * @property next_seq - Sequence number of the next byte to be sent.
 * @property window_size - Size of the sliding window in bytes.
 * @property total - Total bytes to transfer.
 */
export interface WindowState {
  base: number;
  next_seq: number;
  window_size: number;
  total: number;
}
