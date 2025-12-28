import type React from 'react';

/**
 * Props for the TransferCancelButton component.
 */
interface TransferCancelButtonProps {
  /**
   * Callback to cancel the transfer.
   */
  onCancel: () => void;
}

/**
 * A styled button to cancel an active file transfer batch.
 */
const TransferCancelButton: React.FC<TransferCancelButtonProps> = ({ onCancel }) => {
  return (
    <button
      type="button"
      onClick={onCancel}
      className="mt-8 px-6 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/50 rounded-lg font-bold transition-all text-sm uppercase tracking-wide hover:scale-105"
    >
      Cancel Batch
    </button>
  );
};

export default TransferCancelButton;
