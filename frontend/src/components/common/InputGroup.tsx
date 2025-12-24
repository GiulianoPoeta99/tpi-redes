import type React from 'react';

import ControlContainer from './ControlContainer';

interface InputGroupProps {
  label: string;
  children: React.ReactNode;
  indicatorColor?: string;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, children, indicatorColor }) => {
  return (
    <ControlContainer>
      <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
        {indicatorColor && <span className={`w-2 h-2 rounded-full ${indicatorColor}`}></span>}
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </ControlContainer>
  );
};

export default InputGroup;
