import type React from 'react';
import ToastContainer from '../shared/components/Toast';
import type { ToastMessage } from '../shared/types';

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
    <div className="flex min-h-screen bg-gray-900 text-white font-sans relative">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {modals}

      <div className="flex-1 min-w-0 flex flex-col min-h-screen relative">
        {header}

        <main className="flex-1 min-h-0 p-3 sm:p-4 xl:p-5 2xl:p-6 overflow-y-auto 2xl:overflow-hidden">
          <div className="grid min-h-full 2xl:h-full grid-cols-1 gap-4 xl:gap-5 2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] 2xl:gap-6">
            <div className="min-h-0 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-3 sm:p-4 xl:p-5 2xl:p-6 relative overflow-hidden flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto">{mainContent}</div>
            </div>

            <div className="min-h-0 flex flex-col gap-4 xl:gap-5 2xl:gap-6">{sideContent}</div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
