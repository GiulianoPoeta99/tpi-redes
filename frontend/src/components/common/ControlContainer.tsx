import type React from 'react';

interface ControlContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  title?: React.ReactNode;
}

const ControlContainer: React.FC<ControlContainerProps> = ({
  children,
  className = '',
  padding = 'p-4',
  title,
}) => {
  return (
    <div
      className={`bg-gray-900/50 rounded-xl border border-gray-700/50 ${padding} ${className} flex flex-col`}
    >
      {title && (
        <div className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
          {title}
        </div>
      )}
      {children}
    </div>
  );
};

export default ControlContainer;
