import { X } from 'lucide-react';
import type React from 'react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    filename: string;
    totalBytes: number;
    timeTaken: number; // in seconds
    throughput: number; // MB/s
    protocol: string;
  };
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6 relative transform transition-all scale-100">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm">
            📊
          </span>
          Transfer Statistics
        </h3>

        <div className="space-y-4">
          <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
            <StatRow label="File" value={stats.filename} truncate />
            <StatRow label="Protocol" value={stats.protocol.toUpperCase()} />
            <div className="h-px bg-gray-700/50 my-2" />
            <StatRow label="Size" value={`${(stats.totalBytes / 1024 / 1024).toFixed(2)} MB`} />
            <StatRow label="Time" value={`${stats.timeTaken.toFixed(2)}s`} />
            <StatRow label="Throughput" value={`${stats.throughput.toFixed(2)} MB/s`} highlight />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const StatRow: React.FC<{
  label: string;
  value: string | number;
  truncate?: boolean;
  highlight?: boolean;
}> = ({ label, value, truncate, highlight }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-400 text-sm">{label}</span>
    <span
      className={`font-mono text-sm ${
        highlight ? 'text-green-400 font-bold' : 'text-gray-200'
      } ${truncate ? 'truncate max-w-[200px]' : ''}`}
      title={truncate ? String(value) : undefined}
    >
      {value}
    </span>
  </div>
);

export default StatsModal;
