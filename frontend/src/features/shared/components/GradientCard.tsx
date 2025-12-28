import type { LucideIcon } from 'lucide-react';
import type React from 'react';

/**
 * Props for the GradientCard component.
 */
interface GradientCardProps {
  /**
   * Main title of the card.
   */
  title: string;
  /**
   * Description text corresponding to the card.
   */
  description: string;
  /**
   * Icon to display next to the title.
   */
  icon: LucideIcon;
  /**
   * Tailwind class for the icon color.
   * @default 'text-white'
   */
  iconColorClass?: string;
  children?: React.ReactNode;
  /**
   * Visual theme variant.
   * @default 'blue'
   */
  variant?: 'red' | 'blue' | 'purple';
}

/**
 * A visually rich card component with a gradient background.
 */
const GradientCard: React.FC<GradientCardProps> = ({
  title,
  description,
  icon: Icon,
  iconColorClass = 'text-white',
  children,
  variant = 'blue',
}) => {
  const gradients = {
    red: 'from-red-900/40 to-orange-900/40 border-red-500/30',
    blue: 'from-blue-900/40 to-indigo-900/40 border-blue-500/30',
    purple: 'from-purple-900/40 to-pink-900/40 border-purple-500/30',
  };

  return (
    <div
      className={`bg-gradient-to-r ${gradients[variant]} border p-6 rounded-2xl flex items-center justify-between shadow-lg`}
    >
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Icon className={iconColorClass} size={28} />
          {title}
        </h2>
        <p
          className={`${variant === 'red' ? 'text-red-200/60' : 'text-blue-200/60'} mt-1 text-sm max-w-lg`}
        >
          {description}
        </p>
      </div>
      {children && <div>{children}</div>}
    </div>
  );
};

export default GradientCard;
