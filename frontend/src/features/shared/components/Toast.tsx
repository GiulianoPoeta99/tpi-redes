import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import type React from 'react';
import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none w-80">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastProps extends ToastMessage {
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ type, title, description, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // 4s auto-dismiss
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'border-green-500 text-green-400',
    error: 'border-red-500 text-red-400',
    info: 'border-blue-500 text-blue-400',
  };

  const iconStyles = {
    success: 'text-green-500 bg-green-500/10',
    error: 'text-red-500 bg-red-500/10',
    info: 'text-blue-500 bg-blue-500/10',
  };

  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`pointer-events-auto flex items-center w-full p-4 bg-gray-900 border-l-4 rounded shadow-2xl shadow-black/50 ${styles[type]}`}
      role="alert"
    >
      <div className={`p-2 rounded-lg flex-shrink-0 ${iconStyles[type]}`}>{icons[type]}</div>
      <div className="ml-3 flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-200 leading-snug">{title}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5 truncate">{description}</p>}
      </div>
      <button
        onClick={onClose}
        type="button"
        className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-gray-500 hover:text-white rounded-lg p-1.5 hover:bg-gray-800 inline-flex h-8 w-8 transition-colors"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

export default ToastContainer;
