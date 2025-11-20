import type React from 'react';

interface SectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

const Section: React.FC<SectionProps> = ({
  title,
  description,
  children,
  headerContent,
  className = '',
  noPadding = false,
}) => {
  return (
    <div
      className={`bg-gray-800/40 border border-gray-700/50 rounded-2xl shadow-sm overflow-hidden flex flex-col ${className}`}
    >
      {(title || description || headerContent) && (
        <div className="px-6 py-4 border-b border-gray-700/50 bg-gray-800/30 backdrop-blur-sm flex items-center justify-between shrink-0">
          <div>
            {title && <h3 className="font-semibold text-white">{title}</h3>}
            {description && <p className="text-sm text-gray-400">{description}</p>}
          </div>
          {headerContent && <div className="flex items-center gap-2">{headerContent}</div>}
        </div>
      )}
      <div className={`flex-1 min-h-0 ${noPadding ? '' : 'p-6'}`}>{children}</div>
    </div>
  );
};

export default Section;
