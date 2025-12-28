import { Activity, type LucideIcon } from 'lucide-react';
import type React from 'react';

/**
 * Props for the HeaderStatusCard.
 *
 * @property title - The main title of the status card.
 * @property subtitle - Subtitle text describing the current state.
 * @property icon - Icon to display in the header.
 * @property status - Current functional status (e.g., 'active', 'idle').
 * @property statusLabel - Text label explaining the status.
 * @property variant - Visual color variant ('blue', 'purple', 'red').
 * @property className - Optional additional CSS classes.
 */
interface HeaderStatusCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  status?: 'active' | 'idle' | 'success' | 'error' | 'warning';
  statusLabel: string;
  variant: 'blue' | 'purple' | 'red';
  className?: string;
}

/**
 * A status card component displayed in the header, showing current mode and status.
 */
const HeaderStatusCard: React.FC<HeaderStatusCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  status = 'idle',
  statusLabel,
  variant,
  className = '',
}) => {
  const styles = {
    blue: {
      container: 'bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border-blue-500/30',
      icon: 'text-blue-500',
      subtitle: 'text-blue-200/60',
    },
    purple: {
      container: 'bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500/30',
      icon: 'text-purple-500',
      subtitle: 'text-purple-200/60',
    },
    red: {
      container: 'bg-gradient-to-r from-mode-mitm-dim to-orange-900/40 border-mode-mitm/30',
      icon: 'text-mode-mitm',
      subtitle: 'text-red-200/60',
    },
  };

  const statusStyles = {
    active: 'bg-green-500/20 border-green-500 text-green-400 animate-pulse',
    success: 'bg-green-500/20 border-green-500 text-green-400',
    idle: 'bg-gray-800 border-gray-700 text-gray-400',
    error: 'bg-red-500/20 border-red-500 text-red-400',
    warning: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
  };

  const config = styles[variant];

  return (
    <div
      className={`h-full min-w-[400px] min-h-[74px] border px-4 py-3 rounded-xl flex items-center justify-between shadow-lg gap-6 ${config.container} ${className}`}
    >
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Icon className={config.icon} size={20} />
          {title}
        </h2>
        <p className={`text-xs ${config.subtitle}`}>{subtitle}</p>
      </div>
      <div
        className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${statusStyles[status]}`}
      >
        <Activity size={16} />
        <span className="font-mono font-bold text-xs">{statusLabel}</span>
      </div>
    </div>
  );
};

export default HeaderStatusCard;
