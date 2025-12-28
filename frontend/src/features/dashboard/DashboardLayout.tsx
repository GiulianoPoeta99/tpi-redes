import type React from 'react';
import ToastContainer, { type ToastMessage } from '../shared/components/Toast';

/**
 * Props for the DashboardLayout component.
 */
interface DashboardLayoutProps {
  /**
   * List of active toast messages.
   */
  toasts: ToastMessage[];
  /**
   * Callback to remove a toast by ID.
   */
  removeToast: (id: string) => void;
  /**
   * Modal components to render.
   */
  modals: React.ReactNode;
  /**
   * Header content.
   */
  header: React.ReactNode;
  /**
   * Main content area (left column).
   */
  mainContent: React.ReactNode;
  /**
   * Side content area (right column).
   */
  sideContent: React.ReactNode;
}

/**
 * The main layout shell for the dashboard, implementing a 2-column grid.
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  toasts,
  removeToast,
  modals,
  header,
  mainContent,
  sideContent,
}) => {
  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans relative">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {modals}

      <div className="flex-1 flex flex-col h-full relative">
        {header}

        <main className="flex-1 p-6 overflow-hidden flex gap-6">
          <div className="flex-[55] bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-6 relative overflow-hidden flex flex-col">
            <div className="h-full overflow-y-auto">{mainContent}</div>
          </div>

          <div className="flex-[45] flex flex-col gap-6 min-w-0">{sideContent}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
