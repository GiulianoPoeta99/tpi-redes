import { Activity } from 'lucide-react';
import type React from 'react';
import BaseModal from '../../shared/components/BaseModal';
import StatsAnalyticChart from './StatsAnalyticChart';
import StatsHistoryList from './StatsHistoryList';
import StatsKpiGrid from './StatsKpiGrid';
import StatsLatestTransfer from './StatsLatestTransfer';

/**
 * Props for the StatsModal component.
 */
interface StatsModalProps {
  /**
   * Whether the modal is open.
   */
  isOpen: boolean;
  /**
   * Callback to close the modal.
   */
  onClose: () => void;
  /**
   * Statistics for the most recent transfer.
   */
  stats: {
    filename: string;
    totalBytes: number;
    timeTaken: number;
    throughput: number;
    protocol: string;
  };
  /**
   * History of file transfers.
   */
  history: {
    timestamp: number;
    filename: string;
    throughput: number;
    size: number;
    duration?: number;
  }[];
}

/**
 * A full-screen modal displaying detailed transfer analytics, charts, and history.
 */
const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats, history }) => {

  const totalFiles = history.length;
  const totalBytes = history.reduce((acc, h) => acc + h.size, 0);
  const maxThroughput = Math.max(...history.map((h) => h.throughput), 1);
  const avgThroughput =
    totalFiles > 0 ? history.reduce((acc, h) => acc + h.throughput, 0) / totalFiles : 0;

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
          <div className="lg:col-span-3 flex flex-col gap-4 h-full min-h-0">
            <StatsKpiGrid
              totalFiles={totalFiles}
              totalBytes={totalBytes}
              totalDuration={totalDuration}
              avgThroughput={avgThroughput}
            />

            <StatsAnalyticChart history={history} maxThroughput={maxThroughput} />

            <StatsLatestTransfer stats={stats} />
          </div>

          <div className="lg:col-span-1">
            <StatsHistoryList history={history} />
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default StatsModal;
