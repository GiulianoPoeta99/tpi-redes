import type React from 'react';

interface InputGroupProps {
  label: string;
  children: React.ReactNode;
  indicatorColor?: string;
}

const InputGroup: React.FC<InputGroupProps> = ({ 
  label, 
  children,
  indicatorColor
}) => {
  return (
    <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
      <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
        {indicatorColor && (
            <span className={`w-2 h-2 rounded-full ${indicatorColor}`}></span>
        )}
        {label}
      </div>
      <div className="flex items-center gap-4">
        {children}
      </div>
    </div>
  );
};

export default InputGroup;
