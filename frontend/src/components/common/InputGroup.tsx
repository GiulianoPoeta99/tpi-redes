import type React from 'react';

import ControlContainer from './ControlContainer';

interface InputGroupProps {
  label: string;
  children: React.ReactNode;
  indicatorColor?: string;
  className?: string;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, children, indicatorColor, className = '' }) => {
  const titleContent = (
    <>
      {indicatorColor && <span className={`w-2 h-2 rounded-full ${indicatorColor}`}></span>}
      {label}
    </>
  );

  return (
    <ControlContainer title={titleContent} className={className}>
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex flex-wrap items-center gap-4 w-full">{children}</div>
      </div>
    </ControlContainer>
  );
};

export default InputGroup;
