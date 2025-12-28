import type React from 'react';

/**
 * Props for the ControlContainer component.
 */
interface ControlContainerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Tailwind class for padding.
   * @default 'p-4'
   */
  padding?: string;
  /**
   * Optional title content displayed at the top.
   */
  title?: React.ReactNode;
}

/**
 * A container styled for grouping UI controls.
 */
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
