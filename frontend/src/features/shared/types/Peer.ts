/**
 * Represents a discovered network peer.
 *
 * @property ip - IP address of the peer.
 * @property port - Optional port number.
 * @property hostname - Hostname if available.
 */
export interface Peer {
  ip: string;
  port?: number;
  hostname?: string;
}
