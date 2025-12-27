import type React from 'react';
import ToastContainer, { type ToastMessage } from '../shared/components/Toast';

interface DashboardLayoutProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
  modals: React.ReactNode;
  header: React.ReactNode;
  mainContent: React.ReactNode;
  sideContent: React.ReactNode;
}

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

        {/* Main Content Area - Grid Layout */}
        <main className="flex-1 p-6 overflow-hidden flex gap-6">
          {/* LEFT COLUMN: Modes (55%) */}
          <div className="flex-[55] bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-6 relative overflow-hidden flex flex-col">
            <div className="h-full overflow-y-auto">{mainContent}</div>
          </div>

          {/* RIGHT COLUMN: Stats + Sniffer (45%) */}
          <div className="flex-[45] flex flex-col gap-6 min-w-0">{sideContent}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
