import type React from 'react';
import Button from './Button';

/**
 * Props for the SubmitButton component.
 */
interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  /**
   * Visual theme variant.
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  isLoading?: boolean;
}

/**
 * A prominent button usually used for form submissions or primary actions.
 */
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
