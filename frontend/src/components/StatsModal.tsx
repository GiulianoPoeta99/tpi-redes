import {
  Activity,
  BarChart3,
  Clock,
  Database,
  FileText,
  History,
  TrendingUp,
  X,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    filename: string;
    totalBytes: number;
    timeTaken: number;
    throughput: number;
    protocol: string;
  };
  history: {
    timestamp: number;
    filename: string;
    throughput: number;
    size: number;
    duration?: number;
  }[];
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats, history }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  // --- Derived Stats ---
  const totalFiles = history.length;
  const totalBytes = history.reduce((acc, h) => acc + h.size, 0);
  const maxThroughput = Math.max(...history.map((h) => h.throughput), 1);
  const avgThroughput =
    totalFiles > 0 ? history.reduce((acc, h) => acc + h.throughput, 0) / totalFiles : 0;

  // Best effort total active time (sum of durations).
  const totalDuration = history.reduce((acc, h) => acc + (h.duration || 0), 0);

  // --- Formatters ---
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSec: number) => {
    return `${(bytesPerSec / 1024 / 1024).toFixed(2)} MB/s`;
  };

  // --- Chart Logic (SVG) ---
  // We want a line/area chart.
  // X Axis: Index 0 to history.length - 1
  // Y Axis: Throughput 0 to maxThroughput
  const chartHeight = 350;
  const chartWidth = 800; // flexible via viewBox
  const padding = 20;

  const getX = (i: number) => {
    if (history.length <= 1) return padding; // Handle single or no data points
    return (i / (history.length - 1)) * (chartWidth - padding * 2) + padding;
  };

  const getY = (throughput: number) => {
    return chartHeight - (throughput / maxThroughput) * (chartHeight - padding * 2) - padding;
  };

  const getPoints = () => {
    if (history.length < 2) return '';
    return history.map((h, i) => `${getX(i)},${getY(h.throughput)}`).join(' ');
  };

  const points = getPoints();
  const areaPath = points
    ? `${points} ${chartWidth - padding},${chartHeight - padding} ${padding},${chartHeight - padding}`
    : '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Transfer Analytics</h2>
              <p className="text-xs text-gray-400">Real-time session performance metrics</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="flex-1 overflow-hidden p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* LEFT COL: Summary Cards & Chart (Span 3 for width) */}
          <div className="lg:col-span-3 flex flex-col gap-4 h-full">
            {/* KPI Cards (Compact Row) */}
            <div className="grid grid-cols-4 gap-4 shrink-0">
              <KpiCard
                icon={<FileText size={16} />}
                label="Files Sent"
                value={totalFiles}
                color="text-blue-400"
                bg="bg-blue-500/10"
              />
              <KpiCard
                icon={<Database size={16} />}
                label="Total Data"
                value={formatBytes(totalBytes)}
                color="text-purple-400"
                bg="bg-purple-500/10"
              />
              <KpiCard
                icon={<Clock size={16} />}
                label="Active Time"
                value={`${totalDuration.toFixed(1)}s`}
                color="text-yellow-400"
                bg="bg-yellow-500/10"
              />
              <KpiCard
                icon={<TrendingUp size={16} />}
                label="Avg Speed"
                value={formatSpeed(avgThroughput)}
                color="text-green-400"
                bg="bg-green-500/10"
              />
            </div>

            {/* CHART SECTION (Expanded) */}
            <div className="bg-gray-800/40 rounded-2xl p-4 border border-gray-700/50 flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-end mb-2 shrink-0">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <BarChart3 size={16} className="text-gray-400" />
                  Throughput History
                </h3>
                <span className="text-xs font-mono text-gray-500">
                  Peak: {formatSpeed(maxThroughput)}
                </span>
              </div>

              {/* Force Chart to Fill Remaining Space */}
              <div className="relative flex-1 w-full bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden group min-h-0">
                {history.length > 1 ? (
                  <div className="relative w-full h-full">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="w-full h-full"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label="Throughput Chart"
                    >
                      <title>Throughput History Chart</title>
                      {/* Grid Lines */}
                      <line
                        x1={padding}
                        y1={padding}
                        x2={chartWidth - padding}
                        y2={padding}
                        stroke="#374151"
                        strokeDasharray="4"
                      />
                      <line
                        x1={padding}
                        y1={chartHeight / 2}
                        x2={chartWidth - padding}
                        y2={chartHeight / 2}
                        stroke="#374151"
                        strokeDasharray="4"
                      />
                      <line
                        x1={padding}
                        y1={chartHeight - padding}
                        x2={chartWidth - padding}
                        y2={chartHeight - padding}
                        stroke="#374151"
                        strokeDasharray="4"
                      />

                      {/* AXIS LABELS */}
                      <text
                        x={padding - 5}
                        y={padding + 5}
                        fill="#6B7280"
                        fontSize="10"
                        textAnchor="end"
                      >
                        {formatSpeed(maxThroughput)}
                      </text>
                      <text
                        x={padding - 5}
                        y={chartHeight - padding}
                        fill="#6B7280"
                        fontSize="10"
                        textAnchor="end"
                      >
                        0 MB/s
                      </text>

                      {/* AREA */}
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon points={areaPath} fill="url(#chartGradient)" />

                      {/* LINE */}
                      <polyline
                        points={points}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Hover Line */}
                      {hoveredIndex !== null && (
                        <line
                          x1={getX(hoveredIndex)}
                          y1={padding}
                          x2={getX(hoveredIndex)}
                          y2={chartHeight - padding}
                          stroke="#60A5FA"
                          strokeWidth="1"
                          strokeDasharray="3"
                        />
                      )}

                      {history.map((h, i) => (
                        // biome-ignore lint/a11y/noStaticElementInteractions: Chart tooltip trigger
                        <rect
                          key={`${h.timestamp}-${i}`}
                          x={getX(i) - chartWidth / history.length / 2}
                          y={0}
                          width={chartWidth / history.length}
                          height={chartHeight}
                          fill="transparent"
                          onMouseEnter={() => setHoveredIndex(i)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          className="cursor-crosshair"
                        />
                      ))}

                      {/* Data Points */}
                      {history.map((h, i) => (
                        <circle
                          key={`${h.timestamp}-${i}`}
                          cx={getX(i)}
                          cy={getY(h.throughput)}
                          r={hoveredIndex === i ? 4 : 2}
                          fill={hoveredIndex === i ? '#60A5FA' : '#3B82F6'}
                          className="transition-all duration-200"
                        />
                      ))}
                    </svg>

                    {/* TOOLTIP */}
                    {hoveredIndex !== null && history[hoveredIndex] && (
                      <div
                        className="absolute pointer-events-none z-10 bg-gray-900/95 border border-gray-700 p-3 rounded-lg shadow-xl backdrop-blur-sm text-xs w-48 transition-all left-0"
                        style={{
                          top: '10%',
                          left: `clamp(10px, ${(getX(hoveredIndex) / chartWidth) * 100}%, calc(100% - 200px))`,
                        }}
                      >
                        <p className="font-bold text-white truncate mb-1">
                          {history[hoveredIndex].filename}
                        </p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-gray-400">
                          <span>Speed:</span>
                          <span className="text-right text-blue-400 font-mono">
                            {formatSpeed(history[hoveredIndex].throughput)}
                          </span>
                          <span>Size:</span>
                          <span className="text-right text-gray-300 font-mono">
                            {formatBytes(history[hoveredIndex].size)}
                          </span>
                          <span>Time:</span>
                          <span className="text-right text-gray-500 font-mono">
                            {new Date(history[hoveredIndex].timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm italic">
                    Not enough data points to display chart
                  </div>
                )}
              </div>
            </div>

            {/* LAST TRANSFER HIGHLIGHT (Slim Horizontal Bar) */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-800/60 rounded-xl p-3 border border-gray-700/50 relative overflow-hidden group shrink-0">
              <div className="flex items-center justify-between relative z-10 gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-gray-900/50 rounded-lg text-gray-400 shrink-0">
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
                    <p className="text-sm font-bold text-blue-400">
                      {stats.protocol.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Time</p>
                    <p className="text-sm font-mono text-white">{stats.timeTaken.toFixed(2)}s</p>
                  </div>
                  <div className="bg-gray-900/50 px-3 py-1 rounded-lg border border-gray-700">
                    <p className="text-[10px] text-gray-500 uppercase">Speed</p>
                    <p className="text-sm font-mono text-green-400">
                      {stats.throughput.toFixed(2)} MB/s
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COL: Recent History List (Span 1) */}
          <div className="lg:col-span-1 bg-gray-800/40 rounded-2xl border border-gray-700/50 flex flex-col overflow-hidden h-full">
            <div className="p-3 border-b border-gray-700/50 bg-gray-800/60 backdrop-blur-sm shrink-0">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <History size={16} className="text-gray-400" />
                Recent
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {[...history].reverse().map((h, i) => (
                <div
                  key={`${h.timestamp}-${i}`}
                  className="p-2 bg-gray-900/50 rounded-lg hover:bg-800 transition-colors border border-gray-800 hover:border-gray-700 group"
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
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) => (
  <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-700/50 flex flex-col items-center justify-center text-center hover:bg-gray-800/60 transition-colors">
    <div className={`p-1.5 rounded-lg ${bg} ${color} mb-1`}>{icon}</div>
    <div className="text-xl font-bold text-white mb-0">{value}</div>
    <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</div>
  </div>
);

export default StatsModal;
