import type React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'glass';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  icon,
}) => {
  const variants = {
    success: 'bg-status-success-bg text-status-success-text border-status-success-border',
    error: 'bg-status-error-bg text-status-error-text border-status-error-border',
    warning: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
    info: 'bg-status-info-bg text-status-info-text border-status-info-border',
    neutral: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border',
    glass: 'bg-glass-surface text-gray-300 border-glass-border backdrop-blur-sm',
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
