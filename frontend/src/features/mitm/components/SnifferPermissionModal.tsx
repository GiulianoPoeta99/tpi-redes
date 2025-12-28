import type React from 'react';

/**
 * Props for SnifferPermissionModal.
 *
 * @property isOpen - Whether the modal is open (visible).
 * @property onDismiss - Callback to dismiss the modal.
 */
interface SnifferPermissionModalProps {
  isOpen: boolean;
  onDismiss: () => void;
}

/**
 * Modal shown when the sniffer fails to start due to permission errors (e.g. lack of root/admin privileges).
 */
const SnifferPermissionModal: React.FC<SnifferPermissionModalProps> = ({ isOpen, onDismiss }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-red-500/50 rounded-xl p-6 max-w-md text-center shadow-2xl mx-4">
        <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-400"
            aria-labelledby="sniffer-access-title"
          >
            <title id="sniffer-access-title">Sniffer Access Required</title>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Sniffer Access Required</h3>
        <p className="text-gray-300 mb-6 leading-relaxed text-sm">
          We need <strong className="text-red-400">Root Privileges</strong> solely to interact with
          the network interface and capture raw packets.
          <br />
          <span className="opacity-75 block mt-2 text-xs">
            This permission is NOT used for file system access or other system modifications.
          </span>
          <span className="block mt-4">Please restart the transfer to try again.</span>
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors border border-gray-700 font-medium cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default SnifferPermissionModal;
