import { Check } from 'lucide-react';
import type React from 'react';

/**
 * Props for the TransferCompleteOverlay component.
 */
interface TransferCompleteOverlayProps {
  /**
   * Total number of files transferred.
   */
  totalFiles: number;
  /**
   * Status to show statistics.
   */
  onShowStats: () => void;
  /**
   * Callback to reset and start over.
   */
  onReset: () => void;
}

/**
 * An overlay displayed when a file transfer batch completes successfully.
 */
const TransferCompleteOverlay: React.FC<TransferCompleteOverlayProps> = ({
  totalFiles,
  onShowStats,
  onReset,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50 backdrop-blur-sm z-10 animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30 mb-6 animate-bounce">
        <Check size={48} className="text-white box-content" />
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">Batch Complete!</h2>
      <p className="text-gray-400 mb-8">All {totalFiles} files transferred successfully.</p>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onShowStats}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors border border-gray-700"
        >
          Last File Stats
        </button>
        <button
          type="button"
          onClick={onReset}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
        >
          Send More
        </button>
      </div>
    </div>
  );
};

export default TransferCompleteOverlay;
