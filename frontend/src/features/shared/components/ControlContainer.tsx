import type React from 'react';

/**
 * Props for the ControlContainer component.
 *
 * @property children - The content of the container.
 * @property className - Optional additional CSS classes.
 * @property padding - Tailwind class for padding. Defaults to 'p-4'.
 * @property title - Optional title content displayed at the top.
 */
interface ControlContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
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
