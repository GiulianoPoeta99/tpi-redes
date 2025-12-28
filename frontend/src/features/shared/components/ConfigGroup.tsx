import type { LucideIcon } from 'lucide-react';
import type React from 'react';

/**
 * Props for the ConfigGroup component.
 */
interface ConfigGroupProps {
  /**
   * Optional icon to display in the header.
   */
  icon?: LucideIcon;
  /**
   * Optional title to display in the header.
   */
  title?: string;
  children: React.ReactNode;
  /**
   * Tailwind class for the icon background color.
   * @default 'bg-status-info-bg'
   */
  iconBgClass?: string;
  /**
   * Tailwind class for the icon text color.
   * @default 'text-status-info-text'
   */
  iconColorClass?: string;
  className?: string;
}

/**
 * A container component for grouping configuration settings with an optional header.
 */
const ConfigGroup: React.FC<ConfigGroupProps> = ({
  icon: Icon,
  title,
  children,
  iconBgClass = 'bg-status-info-bg',
  iconColorClass = 'text-status-info-text',
  className = '',
}) => {
  return (
    <div
      className={`bg-surface-panel border border-gray-700 rounded-2xl p-6 shadow-xl flex flex-col ${className}`}
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

export default ConfigGroup;
