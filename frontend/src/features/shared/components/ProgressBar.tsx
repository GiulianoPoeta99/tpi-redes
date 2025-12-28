import type React from 'react';

/**
 * Props for ProgressBar.
 *
 * @property progress - The progress percentage (0-100).
 * @property label - Optional label text to display above the bar.
 * @property color - Tailwind color name (e.g., 'blue', 'green'). Defaults to 'blue'.
 */
interface ProgressBarProps {
  progress: number;
  label?: string;
  color?: string;
}

/**
 * A simple progress bar component.
 */
const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label, color = 'blue' }) => {
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
          className={`bg-${color}-600 h-2.5 rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
