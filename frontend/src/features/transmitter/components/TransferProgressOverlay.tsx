import type React from 'react';
import DualCircularProgress from './DualCircularProgress';
import TransferCancelButton from './TransferCancelButton';
import TransferStatusInfo from './TransferStatusInfo';

interface TransferProgressOverlayProps {
  progress: number;
  currentFileIndex: number;
  totalFiles: number;
  currentFilename: string;
  onCancel: () => void;
}

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
