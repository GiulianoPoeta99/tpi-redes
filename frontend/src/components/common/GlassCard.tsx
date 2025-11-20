import type { LucideIcon } from 'lucide-react';
import type React from 'react';

interface GlassCardProps {
  icon?: LucideIcon;
  title?: string;
  children: React.ReactNode;
  iconBgClass?: string;
  iconColorClass?: string;
  className?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({
  icon: Icon,
  title,
  children,
  iconBgClass = 'bg-blue-500/10',
  iconColorClass = 'text-blue-400',
  className = '',
}) => {
  return (
    <div
      className={`bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl flex flex-col ${className}`}
    >
      {(Icon || title) && (
        <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
          {Icon && (
            <div className={`p-2 rounded-lg ${iconBgClass} ${iconColorClass}`}>
              <Icon size={20} />
            </div>
          )}
          {title && <h3 className="font-bold text-gray-200">{title}</h3>}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
};

export default GlassCard;
