import type React from 'react';
import DelaySlider from './DelaySlider';

/**
 * Props for DelayConfig.
 */
interface DelayConfigProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

/**
 * Component to configure transmission delay.
 * Wraps DelaySlider.
 */
const DelayConfig: React.FC<DelayConfigProps> = (props) => {
  return <DelaySlider {...props} />;
};

export default DelayConfig;
