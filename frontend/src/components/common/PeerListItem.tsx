import { Monitor } from 'lucide-react';
import type React from 'react';

interface PeerListItemProps {
  ip: string;
  port: number;
  hostname?: string;
  onSelect?: () => void;
  className?: string;
}

const PeerListItem: React.FC<PeerListItemProps> = ({
  ip,
  port,
  hostname,
  onSelect,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-blue-500/50 transition-all group relative overflow-hidden ${className}`}
    >
      <div className="flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg text-blue-400 group-hover:bg-blue-500/10 transition-colors">
            <Monitor size={18} />
          </div>
          <div>
            <div className="font-mono font-bold text-gray-200 group-hover:text-blue-400 transition-colors">
              {ip}
            </div>
            <div className="text-xs text-gray-500 font-mono">
              Port: {port} {hostname && `• ${hostname}`}
            </div>
          </div>
        </div>
        <div className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity">
          Connect
        </div>
      </div>
    </button>
  );
};

export default PeerListItem;
