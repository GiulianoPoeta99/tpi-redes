import { FileText } from 'lucide-react';
import type React from 'react';
import type { TransferStats } from '../types';

/**
 * Props for the StatsLatestTransfer component.
 *
 * @property stats - The statistics object to display.
 */
interface StatsLatestTransferProps {
  stats: TransferStats;
}

/**
 * A component displaying a summary row for the most recent file transfer.
 */
const StatsLatestTransfer: React.FC<StatsLatestTransferProps> = ({ stats }) => {
  return (
    <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10 relative overflow-hidden group shrink-0">
      <div className="flex items-center justify-between relative z-10 gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 bg-black/20 rounded-lg text-gray-400 shrink-0">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 uppercase font-bold">Latest Transfer</p>
            <p className="text-sm font-bold text-white truncate" title={stats.filename}>
              {stats.filename || 'Waiting for transfer...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Protocol</p>
            <p className="text-sm font-bold text-blue-400">{stats.protocol.toUpperCase()}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Time</p>
            <p className="text-sm font-mono text-white">{stats.timeTaken.toFixed(2)}s</p>
          </div>
          <div className="bg-black/20 px-3 py-1 rounded-lg border border-white/10">
            <p className="text-[10px] text-gray-500 uppercase">Speed</p>
            <p className="text-sm font-mono text-green-400">{stats.throughput.toFixed(2)} MB/s</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsLatestTransfer;
