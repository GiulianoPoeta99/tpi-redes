import { Loader2, Radio, Wifi } from 'lucide-react';
import type React from 'react';
import BaseModal from './common/BaseModal';
import EmptyState from './common/EmptyState';
import PeerListItem from './common/PeerListItem';

interface Peer {
  ip: string;
  port: number;
  hostname?: string;
}

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (peer: Peer) => void;
  scanning: boolean;
  peers: Peer[];
  error?: string;
}

const ScanModal: React.FC<ScanModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  scanning,
  peers,
  error,
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Discovering Peers"
      description="Looking for devices broadcasting on port 37020 (UDP)"
      icon={Radio}
      size="sm"
    >
      <div className="min-h-[200px] flex flex-col">
        {scanning && peers.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 py-8 text-gray-500 space-y-4">
            <Loader2 size={32} className="text-blue-500 animate-spin" />
            <p className="text-sm">Scanning local network...</p>
          </div>
        )}

        {!scanning && peers.length === 0 && !error && (
          <EmptyState
            icon={Wifi}
            title="No peers found"
            description="Make sure receivers are running on the same network."
            className="flex-1 py-8"
          />
        )}

        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-lg text-sm text-center border border-red-500/20 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {peers.map((peer, idx) => (
            <PeerListItem
              key={`${peer.ip}-${idx}`}
              ip={peer.ip}
              port={peer.port}
              hostname={peer.hostname}
              onSelect={() => onSelect(peer)}
            />
          ))}
        </div>
      </div>
    </BaseModal>
  );
};

export default ScanModal;
