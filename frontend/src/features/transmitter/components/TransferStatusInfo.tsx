import type React from 'react';

interface TransferStatusInfoProps {
  currentFileIndex: number;
  totalFiles: number;
  currentFilename: string;
  batchProgress: number;
}

const TransferStatusInfo: React.FC<TransferStatusInfoProps> = ({
  currentFileIndex,
  totalFiles,
  currentFilename,
  batchProgress,
}) => {
  return (
    <div className="mt-8 text-center">
      <p className="text-proto-tcp animate-pulse font-medium tracking-wide mb-1">
        SENDING FILE {currentFileIndex + 1} OF {totalFiles}
      </p>
      <p className="text-sm text-gray-400 font-mono truncate max-w-xs mx-auto">{currentFilename}</p>

      <div className="mt-2 text-xs text-mode-tx font-mono">
        Batch Progress: {Math.round(batchProgress)}%
      </div>
    </div>
  );
};

export default TransferStatusInfo;
