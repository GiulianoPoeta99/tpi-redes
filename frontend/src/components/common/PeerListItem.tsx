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
      className={`w-full text-left p-3 rounded-lg bg-glass-surface backdrop-blur-sm border border-glass-border hover:bg-glass-hover hover:border-primary/50 transition-all group relative overflow-hidden ${className}`}
    >
      <div className="flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-glass-surface rounded-lg text-status-info-text group-hover:bg-status-info-bg transition-colors">
            <Monitor size={18} />
          </div>
          <div>
            <div className="font-mono font-bold text-gray-200 group-hover:text-status-info-text transition-colors">
              {ip}
            </div>
            <div className="text-xs text-gray-500 font-mono">
              Port: {port} {hostname && `• ${hostname}`}
            </div>
          </div>
        </div>
        <div className="px-2 py-1 bg-status-info-bg text-status-info-text text-[10px] font-bold uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity">
          Connect
        </div>
      </div>
    </button>
  );
};

export default PeerListItem;
