/**
 * Statistics for the MITM attack session.
 *
 * @property intercepted - Number of packets intercepted.
 * @property corrupted - Number of packets corrupted.
 */
export interface MitmStats {
  intercepted: number;
  corrupted: number;
}
