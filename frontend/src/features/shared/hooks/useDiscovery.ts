import { useState } from 'react';

interface Peer {
  ip: string;
  port?: number;
}

export const useDiscovery = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [error, setError] = useState<string>();

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
