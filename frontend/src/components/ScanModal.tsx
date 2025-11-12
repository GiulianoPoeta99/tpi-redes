import { Loader2, Monitor, Radio, Wifi } from 'lucide-react';
import type React from 'react';
import BaseModal from './common/BaseModal';

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
          <div className="text-center flex-1 flex flex-col items-center justify-center py-8 text-gray-500">
            <Wifi size={48} className="mb-4 opacity-20" />
            <p className="font-medium text-gray-300">No peers found</p>
            <p className="text-xs mt-1 max-w-[200px]">Make sure receivers are running on the same network.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-lg text-sm text-center border border-red-500/20 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {peers.map((peer, idx) => (
            <button
              type="button"
              key={`${peer.ip}-${idx}`}
              onClick={() => onSelect(peer)}
              className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/80 border border-gray-700 hover:border-blue-500/50 transition-all group relative overflow-hidden"
            >
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-700/50 rounded-lg text-blue-400">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <div className="font-mono font-bold text-gray-200 group-hover:text-blue-400 transition-colors">
                      {peer.ip}
                    </div>
                    <div className="text-xs text-gray-500">Port: {peer.port}</div>
                  </div>
                </div>
                <div className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Connect
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </BaseModal>
  );
};

export default ScanModal;
