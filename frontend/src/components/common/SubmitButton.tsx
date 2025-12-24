import type React from 'react';
import Button from './Button';

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success'; 
  isLoading?: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  icon,
  isLoading,
  ...props
}) => {
  return (
    <Button
      variant={variant}
      size="lg"
      isLoading={isLoading}
      icon={icon}
      className={`w-full py-3 text-lg font-bold shadow-xl justify-center shrink-0 ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
};

export default SubmitButton;
