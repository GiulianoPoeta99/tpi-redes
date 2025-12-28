import { BarChart3 } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { formatBytes, formatSpeed } from '../../shared/utils/formatters';

/**
 * Represents a historical data point for throughput.
 */
interface HistoryItem {
  /**
   * Timestamp of the event.
   */
  timestamp: number;
  /**
   * Name of the file transferred.
   */
  filename: string;
  /**
   * Throughput achieved in bytes/sec.
   */
  throughput: number;
  /**
   * Size of the file in bytes.
   */
  size: number;
}

/**
 * Props for the StatsAnalyticChart component.
 */
interface StatsAnalyticChartProps {
  /**
   * Array of historical data points.
   */
  history: HistoryItem[];
  /**
   * Maximum throughput value for scaling the Y-axis.
   */
  maxThroughput: number;
}

/**
 * A line chart visualizing throughput history of file transfers.
 */
const StatsAnalyticChart: React.FC<StatsAnalyticChartProps> = ({ history, maxThroughput }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartHeight = 350;
  const chartWidth = 800;
  const padding = 20;

  const getX = (i: number) => {
    if (history.length <= 1) return padding;
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
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex-1 flex flex-col min-h-0 relative">
      <div className="flex justify-between items-end mb-2 shrink-0">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <BarChart3 size={16} className="text-gray-400" />
          Throughput History
        </h3>
        <span className="text-xs font-mono text-gray-500">Peak: {formatSpeed(maxThroughput)}</span>
      </div>

      <div className="relative flex-1 w-full bg-black/20 rounded-xl border border-white/10 overflow-hidden group min-h-0">
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


              <text x={padding - 5} y={padding + 5} fill="#6B7280" fontSize="10" textAnchor="end">
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


              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={areaPath} fill="url(#chartGradient)" />


              <polyline
                points={points}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />


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
                // biome-ignore lint/a11y/noStaticElementInteractions: Tooltip trigger
                <rect
                  key={`${h.timestamp}-${i}`}
                  onClick={() => {}}
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


            {hoveredIndex !== null && history[hoveredIndex] && (
              <div
                className="absolute pointer-events-none z-10 bg-gray-900/95 border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-sm text-xs w-48 transition-all left-0"
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
  );
};

export default StatsAnalyticChart;
