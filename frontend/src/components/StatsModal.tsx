import { Activity, BarChart3, FileText, History, TrendingUp, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

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
  history: {
    timestamp: number;
    filename: string;
    throughput: number; // B/s
    size: number;
  }[];
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats, history }) => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  if (!isOpen) return null;

  const totalBytesSession = history.reduce((acc, curr) => acc + curr.size, 0);
  const totalFilesSession = history.length;
  // Use last 15 items for chart
  const recentHistory = history.slice(-15);
  const maxThroughput = Math.max(...recentHistory.map((h) => h.throughput), 1);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg relative transform transition-all scale-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Section */}
        <div className="p-6 pb-2">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-gray-700/50 hover:bg-gray-700 p-1 rounded-lg z-10"
          >
            <X size={20} />
          </button>

          <h3 className="text-xl font-bold text-white flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp size={20} />
            </div>
            <div>
              Transfer Statistics
              <span className="block text-xs font-normal text-gray-400 mt-0.5">
                detailed performance metrics
              </span>
            </div>
          </h3>

          {/* Tabs */}
          <div className="flex p-1 bg-gray-900/50 rounded-lg mt-6 border border-gray-700/50">
            <button
              type="button"
              onClick={() => setActiveTab('current')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'current'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <FileText size={16} /> Last Transfer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <BarChart3 size={16} /> Session History
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 pt-4 overflow-y-auto space-y-6 overflow-x-hidden custom-scrollbar flex-1">
          {activeTab === 'current' ? (
            <div className="animate-in slide-in-from-left fade-in duration-300">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                <Activity size={14} /> Detail View
              </div>
              <div className="bg-gray-900/50 rounded-xl p-5 space-y-4 border border-gray-700/50 shadow-inner">
                <StatRow label="File Name" value={stats.filename} truncate />
                <StatRow label="Protocol Used" value={stats.protocol.toUpperCase()} />
                <div className="h-px bg-gray-700/50 my-2" />
                <StatRow
                  label="File Size"
                  value={`${(stats.totalBytes / 1024 / 1024).toFixed(2)} MB`}
                />
                <StatRow label="Duration" value={`${stats.timeTaken.toFixed(2)}s`} />
                <StatRow
                  label="Avg Throughput"
                  value={`${stats.throughput.toFixed(2)} MB/s`}
                  highlight
                />
              </div>

              <div className="mt-4 p-4 bg-blue-900/10 rounded-xl border border-blue-500/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <FileText size={16} />
                </div>
                <p className="text-xs text-blue-200 leading-relaxed">
                  This transfer completed successfully using the{' '}
                  <strong>{stats.protocol.toUpperCase()}</strong> protocol.
                </p>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right fade-in duration-300">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                <History size={14} /> Global Overview
              </div>
              <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-700/50 shadow-inner">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                    <div className="text-3xl font-bold text-white mb-1">{totalFilesSession}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Files Sent
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                    <div className="text-3xl font-bold text-blue-400 mb-1">
                      {formatBytes(totalBytesSession)}
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Total Data
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="mb-2 flex justify-between items-end">
                  <span className="text-xs font-semibold text-gray-500">
                    Throughput Trend (Last 15)
                  </span>
                </div>
                <div className="h-40 flex items-end gap-1 px-1 bg-gray-900/30 rounded-lg p-2 border border-gray-800">
                  {recentHistory.map((h, i) => {
                    const heightPercent = Math.max((h.throughput / maxThroughput) * 100, 5); // Min 5% height
                    return (
                      <div
                        key={`${h.timestamp}-${i}`}
                        className="flex-1 bg-gradient-to-t from-blue-600/20 to-blue-500/50 hover:to-blue-400 transition-all rounded-t-sm relative group cursor-help"
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 text-[10px] text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none transform transition-all shadow-xl">
                          <div className="text-xs font-bold text-blue-300 mb-0.5">
                            {(h.throughput / 1024 / 1024).toFixed(1)} MB/s
                          </div>
                          <div className="text-gray-400 opacity-80">{h.filename}</div>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-gray-900 border-b border-r border-gray-700 transform rotate-45"></div>
                        </div>
                      </div>
                    );
                  })}
                  {recentHistory.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 italic">
                      No session history available yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-0 mt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg hover:shadow-gray-700/20 border border-gray-600"
          >
            Close Dashboard
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
  <div className="flex justify-between items-center group">
    <span className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
      {label}
    </span>
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
