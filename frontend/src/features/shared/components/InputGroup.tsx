import type React from 'react';

import ControlContainer from './ControlContainer';

/**
 * Props for the InputGroup component.
 *
 * @property label - Title label for the group.
 * @property children - The content of the input group.
 * @property indicatorColor - Optional color class for a small indicator dot.
 * @property className - Optional additional CSS classes.
 */
interface InputGroupProps {
  label: string;
  children: React.ReactNode;
  indicatorColor?: string;
  className?: string;
}

/**
 * A grouped container with a labeled header, used for forms and inputs.
 */
const InputGroup: React.FC<InputGroupProps> = ({
  label,
  children,
  indicatorColor,
  className = '',
}) => {
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
