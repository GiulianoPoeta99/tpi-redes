import { Loader2 } from 'lucide-react';
import type React from 'react';

/**
 * Props for the Button component.
 * Extends standard HTML button attributes.
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The visual style variant of the button.
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass' | 'success';
  /**
   * The size of the button.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'icon';
  /**
   * If true, shows a loading spinner instead of the icon.
   * @default false
   */
  isLoading?: boolean;
  /**
   * Optional icon to display before the children (or replaced by loader if loading).
   */
  icon?: React.ReactNode;
}

/**
 * A highly customizable button component supporting various variants, sizes, and states.
 */
const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 border border-transparent focus:ring-blue-500',
    secondary:
      'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 focus:ring-gray-500',
    danger:
      'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 focus:ring-red-500',
    ghost: 'hover:bg-white/5 text-gray-400 hover:text-white',
    glass:
      'bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-sm shadow-sm',
    success:
      'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/40 border border-transparent focus:ring-green-500',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5',
    md: 'text-sm px-4 py-2 rounded-lg gap-2',
    lg: 'text-base px-6 py-3 rounded-xl gap-2.5',
    icon: 'p-2 rounded-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      type="button"
      {...props}
    >
      {isLoading ? <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 18} /> : icon}
      {children}
    </button>
  );
};

export default Button;
