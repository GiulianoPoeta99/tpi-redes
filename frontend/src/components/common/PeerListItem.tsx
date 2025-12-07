import { Monitor } from 'lucide-react';
import type React from 'react';

interface PeerListItemProps {
  ip: string;
  port: number;
  hostname?: string;
  onSelect?: () => void;
  className?: string;
}

const PeerListItem: React.FC<PeerListItemProps> = ({ ip, port, hostname, onSelect }) => {
  return (
    <button
      type="button"
      className="w-full group bg-gray-800/40 backdrop-blur-sm border border-white/5 p-3 rounded-lg flex items-center justify-between hover:bg-gray-800/70 hover:border-white/10 transition-all outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer text-left"
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 group-hover:bg-blue-500/20 transition-colors">
          <Monitor size={18} />
        </div>
        <div>
          <p className="font-medium text-gray-200 group-hover:text-white transition-colors">
            {hostname || 'Unknown Host'}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-mono">{ip}</span>
            <span>•</span>
            <span>Port {port}</span>
          </div>
        </div>
      </div>
      <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 font-bold text-xs uppercase">
        Connect &rarr;
      </div>
    </button>
  );
};

export default PeerListItem;
