import { Activity, ArrowDownCircle, ArrowUpCircle, HardDrive } from 'lucide-react';
import type React from 'react';
import type { AppStats } from '../../shared/services/StorageService';

/**
 * Props for the StatsPanel component.
 */
interface StatsPanelProps {
  /**
   * Application statistics.
   */
  stats: AppStats;
}

/**
 * A reusable card component for displaying a single statistic.
 */
const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'cyan' | 'pink';
}> = ({ label, value, icon: Icon, color }) => {
  const colors = {
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    purple: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
    pink: 'border-pink-500/30 bg-pink-500/10 text-pink-400',
  };

  const getFontSizeClass = (val: string | number) => {
    const str = String(val);
    // "100.00 MB" is 9 chars -> text-sm
    // "10000" is 5 chars -> text-lg
    if (str.length >= 9) return 'text-sm';
    if (str.length >= 6) return 'text-base';
    if (str.length >= 4) return 'text-lg';
    return 'text-xl';
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border ${colors[color]} relative overflow-hidden group transition-all hover:bg-opacity-20`}
    >
      <div className={`p-3 rounded-lg bg-gray-900/50 ${colors[color].split(' ')[2]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p
          className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${
            colors[color].split(' ')[2]
          }`}
        >
          {label}
        </p>
        <p
          className={`${getFontSizeClass(
            value,
          )} font-mono font-bold text-white tracking-tight transition-all duration-300`}
        >
          {value}
        </p>
      </div>
    </div>
  );
};

/**
 * A side panel displaying summary cards for network packets and data volume.
 */
const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 h-full">
      <StatCard label="Packets Sent" value={stats.totalSent} icon={ArrowUpCircle} color="blue" />
      <StatCard
        label="Data Sent"
        value={formatBytes(stats.bytesSent)}
        icon={HardDrive}
        color="cyan"
      />

      <StatCard
        label="Packets Recv"
        value={stats.totalReceived}
        icon={ArrowDownCircle}
        color="purple"
      />
      <StatCard
        label="Data Recv"
        value={formatBytes(stats.bytesReceived)}
        icon={Activity}
        color="pink"
      />
    </div>
  );
};

export default StatsPanel;
