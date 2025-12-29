/**
 * Configuration state for the MITM proxy.
 *
 * @property listenPort - Local port to listen on.
 * @property targetIp - IP address to forward traffic to.
 * @property targetPort - Port to forward traffic to.
 * @property corruption - Probability of data corruption (0.0 - 1.0).
 */
export interface MitmConfig {
  listenPort: number | string;
  targetIp: string;
  targetPort: number | string;
  corruption: number;
  interface?: string;
  protocol: 'tcp' | 'udp';
}
