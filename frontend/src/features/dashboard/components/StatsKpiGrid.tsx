import { Clock, Database, FileText, TrendingUp } from 'lucide-react';
import type React from 'react';
import { formatBytes, formatSpeed } from '../../../features/shared/utils/formatters';
import KpiCard from '../../shared/components/KpiCard';

/**
 * Props for the StatsKpiGrid component.
 */
interface StatsKpiGridProps {
  /**
   * Total number of files processed.
   */
  totalFiles: number;
  /**
   * Total bytes processed.
   */
  totalBytes: number;
  /**
   * Total duration of activity in seconds.
   */
  totalDuration: number;
  /**
   * Average throughput achieved.
   */
  avgThroughput: number;
}

/**
 * A grid of Key Performance Indicator (KPI) cards summarizing transfer statistics.
 */
const StatsKpiGrid: React.FC<StatsKpiGridProps> = ({
  totalFiles,
  totalBytes,
  totalDuration,
  avgThroughput,
}) => {
  return (
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
  );
};

export default StatsKpiGrid;
