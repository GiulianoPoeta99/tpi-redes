import { Activity, ArrowDownCircle, ArrowUpCircle, HardDrive } from 'lucide-react';
import type React from 'react';
import type { AppStats } from '../services/StorageService';

interface StatsPanelProps {
  stats: AppStats;
}

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

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border ${colors[color]} relative overflow-hidden group transition-all hover:bg-opacity-20`}
    >
      <div className={`p-3 rounded-lg bg-gray-900/50 ${colors[color].split(' ')[2]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p
          className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${colors[color].split(' ')[2]}`}
        >
          {label}
        </p>
        <p className="text-xl font-mono font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
};

const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  const formatBytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

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
