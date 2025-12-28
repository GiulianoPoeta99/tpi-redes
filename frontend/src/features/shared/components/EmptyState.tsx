import type { LucideIcon } from 'lucide-react';
import type React from 'react';

/**
 * Props for the EmptyState component.
 */
interface EmptyStateProps {
  /**
   * Optional icon to display.
   */
  icon?: LucideIcon;
  /**
   * Main title to display.
   */
  title: string;
  /**
   * Optional detailed description.
   */
  description?: string;
  /**
   * Optional action button or element.
   */
  action?: React.ReactNode;
  className?: string;
}

/**
 * A component to display when there is no data or content to show.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 text-center text-gray-500 ${className}`}
    >
      {Icon && (
        <div className="bg-white/5 p-4 rounded-full mb-4">
          <Icon className="text-gray-400" size={32} />
        </div>
      )}
      <h3 className="text-lg font-medium text-white mb-1">{title}</h3>
      {description && <p className="text-sm max-w-sm mx-auto mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
