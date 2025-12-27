import { Activity } from 'lucide-react';
import type React from 'react';
import BaseModal from '../../shared/components/BaseModal';
import StatsAnalyticChart from './StatsAnalyticChart';
import StatsHistoryList from './StatsHistoryList';
import StatsKpiGrid from './StatsKpiGrid';
import StatsLatestTransfer from './StatsLatestTransfer';

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
  // --- Derived Stats ---
  const totalFiles = history.length;
  const totalBytes = history.reduce((acc, h) => acc + h.size, 0);
  const maxThroughput = Math.max(...history.map((h) => h.throughput), 1);
  const avgThroughput =
    totalFiles > 0 ? history.reduce((acc, h) => acc + h.throughput, 0) / totalFiles : 0;

  // Best effort total active time (sum of durations).
  const totalDuration = history.reduce((acc, h) => acc + (h.duration || 0), 0);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Analytics"
      description="Real-time session performance metrics"
      icon={Activity}
      size="full"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden p-0 grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          {/* LEFT COL: Summary Cards & Chart (Span 3 for width) */}
          <div className="lg:col-span-3 flex flex-col gap-4 h-full min-h-0">
            {/* KPI Cards (Compact Row) */}
            <StatsKpiGrid
              totalFiles={totalFiles}
              totalBytes={totalBytes}
              totalDuration={totalDuration}
              avgThroughput={avgThroughput}
            />

            {/* CHART SECTION (Expanded) */}
            <StatsAnalyticChart history={history} maxThroughput={maxThroughput} />

            {/* LAST TRANSFER HIGHLIGHT (Slim Horizontal Bar) */}
            <StatsLatestTransfer stats={stats} />
          </div>

          {/* RIGHT COL: Recent History List (Span 1) */}
          <StatsHistoryList history={history} />
        </div>
      </div>
    </BaseModal>
  );
};

export default StatsModal;
