import { Clock, Folder } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { AppStats } from '../services/StorageService';
import { StorageService } from '../services/StorageService';
import HistoryModal from './HistoryModal';
import MitmView from './MitmView';
import { ReceivedFilesModal } from './ReceivedFilesModal';
import ReceiverView from './ReceiverView';
import SnifferLog from './SnifferLog';
import StatsPanel from './StatsPanel';
import ToastContainer, { type ToastMessage } from './Toast';
import TransmitterView from './TransmitterView';

// Dashboard "Desktop" Layout with 3 modes + Persistent Sidebars
const Dashboard: React.FC = () => {
  const [mode, setMode] = useState<'receiver' | 'transmitter' | 'mitm'>('receiver');
  const [stats, setStats] = useState<AppStats>(StorageService.loadStats());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

  const addToast = useCallback(
    (type: 'success' | 'error' | 'info', title: string, description?: string) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => {
        const newToasts = [{ id, type, title, description }, ...prev];
        return newToasts.slice(0, 3); // Keep only first 3 (newest)
      });
    },
    [],
  );
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Listen for stats and logs globally
  useEffect(() => {
    // Stats Listener
    const cleanupStats = window.api.onStatsUpdate(
      (newStats: { total_sent?: number; bytes_sent?: number; delta_bytes?: number }) => {
        setStats((prev) => {
          let newBytes = prev.bytesSent;
          if (newStats.delta_bytes) {
            newBytes += newStats.delta_bytes;
          }

          const updated = {
            ...prev,
            totalSent: newStats.total_sent || prev.totalSent,
            bytesSent: newBytes,
          };
          StorageService.saveStats(updated);
          return updated;
        });
      },
    );

    // Global Log Listener for Toasts & Sniffer
    // We filter specific events that deserve a global toast
    const cleanupLog = window.api.onLog((log: string) => {
      try {
        const parsed = JSON.parse(log);
        const events = Array.isArray(parsed) ? parsed : [parsed];

        // Flatten batched events into individual log strings for SnifferLog
        // Filter out high-frequency events that have their own UI components (PacketTable, StatsPanel)
        const newLogLines = events
          // biome-ignore lint/suspicious/noExplicitAny: Log Events are dynamic
          .filter((e: any) => !['PACKET_CAPTURE', 'STATS', 'WINDOW_UPDATE'].includes(e.type))
          // biome-ignore lint/suspicious/noExplicitAny: Log Events are dynamic
          .map((e: any) => JSON.stringify(e));

        if (newLogLines.length > 0) {
          setLogs((prev) => [...prev, ...newLogLines]);
        }

        // biome-ignore lint/suspicious/noExplicitAny: Log Events are dynamic
        events.forEach((json: any) => {
          if (json.type === 'ERROR') {
            addToast('error', 'Error', json.message);
          } else if (json.type === 'SERVER_READY') {
            addToast('success', 'Server Started', `Listening on port ${json.port}`);
          } else if (json.type === 'TRANSFER_UPDATE' && json.status === 'complete') {
            addToast('success', 'Transfer Complete', json.filename);
            setStats((prev) => {
              const updated = { ...prev, totalSent: prev.totalSent + 1 };
              StorageService.saveStats(updated);
              return updated;
            });
          }
        });
      } catch (_e) {
        // Fallback for non-JSON logs or parse errors
        setLogs((prev) => [...prev, log]);
      }
    });

    // Packet Listener for Real-time Stats
    const cleanupPackets = window.api.onPacketCapture((packet) => {
      setStats((prev) => {
        const isRx = mode === 'receiver';
        const isTx = mode === 'transmitter';

        const updated = {
          ...prev,
          totalReceived: isRx ? prev.totalReceived + 1 : prev.totalReceived,
          bytesReceived: isRx ? prev.bytesReceived + packet.length : prev.bytesReceived,
          totalSent: isTx ? prev.totalSent + 1 : prev.totalSent,
          bytesSent: isTx ? prev.bytesSent + packet.length : prev.bytesSent,
        };
        return updated;
      });
    });

    return () => {
      cleanupStats?.();
      cleanupLog?.();
      cleanupPackets?.();
    };
  }, [addToast, mode]);

  // Switching modes should hard-kill previous process to free ports
  const handleModeSwitch = async (newMode: 'receiver' | 'transmitter' | 'mitm') => {
    if (isBusy) {
      addToast('info', 'Action Required', 'Stop current operation before switching.');
      return;
    }
    if (mode === newMode) return;

    // Clear Logs on mode switch (Optional, but cleaner)
    setLogs([]);

    // Stop current backend process
    try {
      await window.api.stopProcess();
      console.log('Stopped background process.');
    } catch (e) {
      console.error('Failed to stop process', e);
    }

    setMode(newMode);
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans relative">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
      <ReceivedFilesModal isOpen={showFiles} onClose={() => setShowFiles(false)} />
      {/* Sidebar / Stats Area (Left or Right? User said "no side menu", but "stats in dashboard")
                User said: "packt sniffer and statistics should be in the dashboard... not side menu"
                Implying they should be visible widgets.
                Let's make a top-bar for navigation and a main grid for content + widgets.
            */}

      <div className="flex-1 flex flex-col h-full relative">
        {/* Top Navigation */}
        <header className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between shadow-md z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              TPI Redes
            </h1>

            {/* Segmented Control */}
            <div className="flex bg-gray-900 rounded-lg p-1 ml-8">
              {['receiver', 'transmitter', 'mitm'].map((m) => (
                <button
                  type="button"
                  key={m}
                  disabled={isBusy}
                  onClick={() => handleModeSwitch(m as 'receiver' | 'transmitter' | 'mitm')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === m
                      ? 'bg-gray-700 text-white shadow-lg'
                      : isBusy
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                  {isBusy && mode === m && <span className="ml-2 text-xs">🔒</span>}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFiles(true)}
              className="ml-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
              title="Received Files Explorer"
              type="button"
            >
              <Folder size={20} />
            </button>

            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="ml-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
              title="Transfer History"
            >
              <Clock size={20} />
            </button>
          </div>
        </header>

        {/* Main Content Area - Grid Layout */}
        {/* Main Content Area - Split Layout */}
        {/* Main Content Area - Split Layout */}
        <main className="flex-1 p-6 overflow-hidden flex gap-6">
          {/* LEFT COLUMN: Modes (50%) */}
          <div className="flex-1 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-6 relative overflow-hidden flex flex-col">
             <div className="h-full overflow-y-auto">
                {mode === 'receiver' && <ReceiverView setBusy={setIsBusy} />}
                {mode === 'transmitter' && (
                  <TransmitterView setBusy={setIsBusy} addToast={addToast} />
                )}
                {mode === 'mitm' && <MitmView setBusy={setIsBusy} />}
             </div>
          </div>

          {/* RIGHT COLUMN: Stats + Sniffer (50%) */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* Statistics Widget */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-4 flex flex-col justify-center shrink-0">
              <h3 className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wider">
                Network Stats
              </h3>
              <StatsPanel stats={stats} />
            </div>

            {/* Packet Sniffer */}
            <div className="flex-1 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden flex flex-col min-h-0">
               <SnifferLog logs={logs} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
