import type React from 'react';
import SliderInput from '../../shared/components/SliderInput';

/**
 * Props for DelaySlider.
 */
interface DelaySliderProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

/**
 * Slider component for adjusting transmission delay in milliseconds.
 */
const DelaySlider: React.FC<DelaySliderProps> = ({ value, onChange, disabled }) => {
  return (
    <SliderInput
      value={value}
      min={0}
      max={1000}
      step={10}
      onChange={onChange}
      label="Transmission Delay"
      disabled={disabled}
      headerRight={<span className="text-blue-400 font-mono font-bold text-sm">{value} ms</span>}
      accentColor="blue"
      className="flex-1"
    />
  );
};

export default DelaySlider;
