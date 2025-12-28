import { History } from 'lucide-react';
import type React from 'react';
import { formatBytes, formatSpeed } from '../../shared/utils/formatters';
import type { HistoryItem } from '../types';

/**
 * Props for the StatsHistoryList component.
 *
 * @property history - List of history items to display.
 */
interface StatsHistoryListProps {
  history: HistoryItem[];
}

/**
 * A sidebar list displaying recent transfer history with key metrics.
 */
const StatsHistoryList: React.FC<StatsHistoryListProps> = ({ history }) => {
  return (
    <div className="lg:col-span-1 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 flex flex-col overflow-hidden h-full">
      <div className="p-3 border-b border-white/10 bg-white/5 backdrop-blur-sm shrink-0">
        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
          <History size={16} className="text-gray-400" />
          Recent
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {[...history].reverse().map((h, i) => (
          <div
            key={`${h.timestamp}-${i}`}
            className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/5 hover:border-white/10 group"
          >
            <div className="flex justify-between items-start mb-0.5">
              <span
                className="font-medium text-gray-300 text-xs truncate max-w-[120px]"
                title={h.filename}
              >
                {h.filename}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                {new Date(h.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-gray-500">{formatBytes(h.size)}</span>
              <span className="font-mono text-blue-400">{formatSpeed(h.throughput)}</span>
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <div className="text-center py-10 text-gray-600 text-xs">No history.</div>
        )}
      </div>
    </div>
  );
};

export default StatsHistoryList;
