import type React from 'react';
import CircularProgress from '../../../shared/components/CircularProgress';

/**
 * Props for the DualCircularProgress component.
 */
interface DualCircularProgressProps {
  /**
   * Progress of the overall batch (0-100).
   */
  batchProgress: number;
  /**
   * Progress of the current file (0-100).
   */
  fileProgress: number;
}

/**
 * A combined progress indicator showing both batch and file progress using concentric circles.
 */
const DualCircularProgress: React.FC<DualCircularProgressProps> = ({
  batchProgress,
  fileProgress,
}) => {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      <div className="absolute inset-0">
        <CircularProgress
          size={192}
          progress={batchProgress}
          strokeWidth={6}
          className="text-blue-600 transition-all duration-300 ease-linear"
        />
      </div>

      <div className="relative z-10">
        <CircularProgress
          size={128}
          progress={fileProgress}
          strokeWidth={8}
          className="text-cyan-500 transition-all duration-300 ease-out"
        >
          <span className="text-xl font-bold font-mono text-white">
            {Math.round(fileProgress)}%
          </span>
        </CircularProgress>
      </div>
    </div>
  );
};

export default DualCircularProgress;
