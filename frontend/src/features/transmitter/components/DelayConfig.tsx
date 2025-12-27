import type React from 'react';
import DelaySlider from './DelaySlider';

interface DelayConfigProps {
  value: number; // ms
  onChange: (val: number) => void;
  disabled?: boolean;
}

const DelayConfig: React.FC<DelayConfigProps> = (props) => {
  return <DelaySlider {...props} />;
};

export default DelayConfig;
