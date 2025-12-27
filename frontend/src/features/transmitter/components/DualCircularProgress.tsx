import type React from 'react';
import CircularProgress from '../../../shared/components/CircularProgress';

interface DualCircularProgressProps {
  batchProgress: number;
  fileProgress: number;
}

const DualCircularProgress: React.FC<DualCircularProgressProps> = ({
  batchProgress,
  fileProgress,
}) => {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Outer Circle (Batch) */}
      <div className="absolute inset-0">
        <CircularProgress
          size={256}
          progress={batchProgress}
          strokeWidth={6}
          className="text-mode-tx transition-all duration-300 ease-linear"
        />
      </div>

      {/* Inner Circle (File) */}
      <div className="relative z-10">
        <CircularProgress
          size={128}
          progress={fileProgress}
          strokeWidth={8}
          className="text-proto-tcp transition-all duration-300 ease-out"
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
