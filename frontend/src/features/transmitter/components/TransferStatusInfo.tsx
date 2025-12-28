import type React from 'react';

/**
 * Props for the TransferStatusInfo component.
 */
interface TransferStatusInfoProps {
  /**
   * Current file index (0-based).
   */
  currentFileIndex: number;
  /**
   * Total number of files.
   */
  totalFiles: number;
  /**
   * Current file name.
   */
  currentFilename: string;
  /**
   * Overall batch progress percentage (0-100).
   */
  batchProgress: number;
}

/**
 * Displays text information about the current transfer status.
 */
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
