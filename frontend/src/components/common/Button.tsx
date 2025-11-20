import { Loader2 } from 'lucide-react';
import type React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

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
      'bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 border border-transparent focus:ring-blue-500',
    secondary:
      'bg-secondary hover:bg-secondary-hover text-secondary-foreground border border-gray-600 focus:ring-gray-500',
    danger:
      'bg-status-error-bg hover:bg-status-error-bg/20 text-status-error-text border border-status-error-border focus:ring-red-500',
    ghost: 'hover:bg-glass-surface text-gray-400 hover:text-white',
    glass:
      'bg-glass-surface hover:bg-glass-hover text-white border border-glass-border backdrop-blur-sm shadow-sm',
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
