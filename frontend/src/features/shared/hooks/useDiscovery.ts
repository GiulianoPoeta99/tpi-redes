import { useState } from 'react';

/**
 * Represents a discovered network peer.
 */
interface Peer {
  ip: string;
  port?: number;
}

/**
 * Hook to manage network discovery scanning.
 * Provides state and methods to trigger a network scan via the backend.
 *
 * @returns Object containing:
 * - isOpen: Whether the discovery modal/view should be open.
 * - scanning: Boolean indicating if a scan is in progress.
 * - peers: List of discovered peers.
 * - error: Error message if scan failed.
 * - scan: Function to trigger a new scan.
 * - close: Function to close the discovery view.
 */
export const useDiscovery = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [error, setError] = useState<string>();

  /**
   * trigger a network discovery scan.
   */
  const scan = async () => {
    setIsOpen(true);
    setScanning(true);
    setError(undefined);
    setPeers([]);
    try {
      const result = await window.api.scanNetwork();
      setPeers(result || []);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setScanning(false);
    }
  };

  const close = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    scanning,
    peers,
    error,
    scan,
    close,
  };
};
