/**
 * Represents a captured network packet with layer 3/4 details.
 *
 * @property type - The type of the packet (e.g., 'IP', 'ARP').
 * @property timestamp - Time of capture in seconds (epoch).
 * @property src - Source IP address or MAC.
 * @property dst - Destination IP address or MAC.
 * @property protocol - Protocol used (e.g., 'TCP', 'UDP').
 * @property length - Length of the packet in bytes.
 * @property info - Summary info string (e.g., 'Who has 192.168.1.1? Tell ...').
 * @property flags - TCP flags string (e.g., 'SYN', 'ACK').
 * @property seq - TCP sequence number.
 * @property ack - TCP acknowledgment number.
 * @property window - TCP window size.
 * @property mode - Optional capture mode context ('receiver', 'transmitter', 'mitm').
 */
export interface Packet {
  type: string;
  timestamp: number;
  src: string;
  dst: string;
  protocol: string;
  length: number;
  info: string;
  flags: string;
  seq: number;
  ack: number;
  window: number;
  mode?: 'receiver' | 'transmitter' | 'mitm';
}
