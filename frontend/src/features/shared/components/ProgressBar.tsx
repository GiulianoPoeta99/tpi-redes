import type React from 'react';

/**
 * Props for ProgressBar.
 *
 * @property progress - The progress percentage (0-100).
 * @property label - Optional label text to display above the bar.
 * @property variant - Color variant for the progress fill. Defaults to 'blue'.
 */
type ProgressBarVariant = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';

interface ProgressBarProps {
  progress: number;
  label?: string;
  variant?: ProgressBarVariant;
}

/**
 * A simple progress bar component.
 */
const fillVariantClass: Record<ProgressBarVariant, string> = {
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  red: 'bg-red-600',
  yellow: 'bg-yellow-600',
  purple: 'bg-purple-600',
  gray: 'bg-gray-600',
};

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label, variant = 'blue' }) => {
  const safeProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-300">{label}</span>
          <span className="text-sm font-medium text-gray-400">{progress.toFixed(1)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          className={`${fillVariantClass[variant]} h-2.5 rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${safeProgress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
