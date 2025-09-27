import type React from 'react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative animate-fade-in-up">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {scanning ? <span className="animate-spin">⏳</span> : '📡'}
            Discovering Peers
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
          {scanning && peers.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500 space-y-4">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Scanning local network (UDP Broadcast)...</p>
            </div>
          )}

          {!scanning && peers.length === 0 && !error && (
            <div className="text-center py-10 text-gray-500">
              <p className="text-4xl mb-2">🔭</p>
              <p>No peers found.</p>
              <p className="text-xs mt-2">Make sure receivers are running on the same network.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 text-red-400 p-4 rounded-lg text-sm text-center border border-red-500/20">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {peers.map((peer, idx) => (
              <button
                type="button"
                key={`${peer.ip}-${idx}`}
                onClick={() => onSelect(peer)}
                className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 transition-all group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-mono font-bold text-blue-400 group-hover:text-blue-300">
                      {peer.ip}
                    </div>
                    <div className="text-xs text-gray-500">Port: {peer.port}</div>
                  </div>
                  <div className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                    Select
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-800/30 border-t border-gray-800 text-xs text-center text-gray-500">
          Looking for devices broadcasting on port 37020 (UDP)
        </div>
      </div>
    </div>
  );
};

export default ScanModal;
