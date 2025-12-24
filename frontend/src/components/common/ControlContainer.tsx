import type React from 'react';

interface ControlContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}

const ControlContainer: React.FC<ControlContainerProps> = ({
  children,
  className = '',
  padding = 'p-4', // Default padding, can be overridden 'p-3'
}) => {
  return (
    <div
      className={`bg-gray-900/50 rounded-xl border border-gray-700/50 ${padding} ${className}`}
    >
      {children}
    </div>
  );
};

export default ControlContainer;
