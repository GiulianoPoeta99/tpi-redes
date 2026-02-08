import type { LucideIcon } from 'lucide-react';
import type React from 'react';

/**
 * Props for the ConfigGroup component.
 *
 * @property icon - Optional icon to display in the header.
 * @property title - Optional title to display in the header.
 * @property children - The content of the group.
 * @property iconBgClass - Tailwind class for the icon background color. Defaults to 'bg-blue-500/10'.
 * @property iconColorClass - Tailwind class for the icon text color. Defaults to 'text-blue-400'.
 * @property className - Optional additional CSS classes.
 */
interface ConfigGroupProps {
  icon?: LucideIcon;
  title?: string;
  children: React.ReactNode;
  iconBgClass?: string;
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
  iconBgClass = 'bg-blue-500/10',
  iconColorClass = 'text-blue-400',
  className = '',
}) => {
  return (
    <div
      className={`bg-gray-900/50 border border-gray-700 rounded-2xl p-6 shadow-xl flex flex-col ${className}`}
    >
      {(Icon || title) && (
        <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
          {Icon && (
            <div className={`p-2 rounded-lg ${iconBgClass} ${iconColorClass}`}>
              <Icon size={15} />
            </div>
          )}
          {title && <h3 className="font-bold text-gray-200 text-[15px]">{title}</h3>}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
};

export default ConfigGroup;
