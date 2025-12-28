import type React from 'react';
import DualCircularProgress from './DualCircularProgress';
import TransferCancelButton from './TransferCancelButton';
import TransferStatusInfo from './TransferStatusInfo';

/**
 * Props for the TransferProgressOverlay component.
 */
interface TransferProgressOverlayProps {
  /**
   * Current file progress (0-100).
   */
  progress: number;
  /**
   * Index of the current file being transferred.
   */
  currentFileIndex: number;
  /**
   * Total number of files.
   */
  totalFiles: number;
  /**
   * Name of the current file.
   */
  currentFilename: string;
  /**
   * Callback to cancel the transfer.
   */
  onCancel: () => void;
}

/**
 * An overlay displayed during file transmission, showing detailed progress.
 */
const TransferProgressOverlay: React.FC<TransferProgressOverlayProps> = ({
  progress,
  currentFileIndex,
  totalFiles,
  currentFilename,
  onCancel,
}) => {
  const smoothBatchPercent = ((currentFileIndex + progress / 100) / totalFiles) * 100;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-10 animate-in fade-in zoom-in duration-300">
      <DualCircularProgress batchProgress={smoothBatchPercent} fileProgress={progress} />

      <TransferStatusInfo
        currentFileIndex={currentFileIndex}
        totalFiles={totalFiles}
        currentFilename={currentFilename}
        batchProgress={smoothBatchPercent}
      />

      <TransferCancelButton onCancel={onCancel} />
    </div>
  );
};

export default TransferProgressOverlay;
