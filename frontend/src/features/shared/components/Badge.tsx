import type React from 'react';

/**
 * Props for the Badge component.
 *
 * @property children - The content to verify.
 * @property variant - The visual style variant of the badge. Defaults to 'neutral'.
 * @property size - The size of the badge. Defaults to 'md'.
 * @property className - Optional additional CSS classes.
 * @property icon - Optional icon to display before the content.
 */
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'glass';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

/**
 * A styled badge component for displaying status, labels, or tags.
 */
const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  icon,
}) => {
  const variants = {
    success:
      'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]',
    error: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.1)]',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    neutral: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    glass: 'bg-white/5 text-gray-300 border-white/10 backdrop-blur-sm',
  };

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-medium rounded border ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
};

export default Badge;
