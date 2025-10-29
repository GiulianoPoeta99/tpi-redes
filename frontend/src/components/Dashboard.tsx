import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { AppStats } from '../services/StorageService';
import { StorageService } from '../services/StorageService';
import MitmView from './MitmView';
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

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => {
      const newToasts = [...prev, { id, type, message }];
      return newToasts.slice(-3); // Keep only last 3
    });
  }, []);
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
      setLogs((prev) => [...prev, log]); // Update Sniffer Logs

      try {
        const json = JSON.parse(log);
        if (json.type === 'ERROR') {
          addToast('error', json.message);
        } else if (json.type === 'SERVER_READY') {
          addToast('success', `Server listening on port ${json.port}`);
        } else if (json.type === 'TRANSFER_UPDATE' && json.status === 'complete') {
          addToast('success', `Transfer Complete: ${json.filename}`);
          setStats((prev) => {
            const updated = { ...prev, totalSent: prev.totalSent + 1 };
            StorageService.saveStats(updated);
            return updated;
          });
        }
      } catch (_e) {
        // Ignore non-json logs for toasts
        // Normal text logs are handled by setLogs above
      }
    });

    return () => {
      cleanupStats?.();
      cleanupLog?.();
    };
  }, [addToast]);

  // Switching modes should hard-kill previous process to free ports
  const handleModeSwitch = async (newMode: 'receiver' | 'transmitter' | 'mitm') => {
    if (isBusy) {
      addToast('info', 'Stop current operation before switching.');
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
          </div>
        </header>

        {/* Main Content Area - Grid Layout */}
        {/* Main Content Area - Split Layout */}
        <main className="flex-1 p-6 overflow-hidden flex gap-6">
          {/* LEFT COLUMN: Modes + Stats */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* Primary Mode View (Occupies majority of left side) */}
            <div className="flex-[3] bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-6 relative overflow-hidden">
              <div className="h-full overflow-auto">
                {mode === 'receiver' && <ReceiverView setBusy={setIsBusy} />}
                {mode === 'transmitter' && (
                  <TransmitterView setBusy={setIsBusy} addToast={addToast} />
                )}
                {mode === 'mitm' && <MitmView setBusy={setIsBusy} />}
              </div>
            </div>

            {/* Statistics Widget (Bottom of left side) */}
            <div className="flex-1 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-4 flex flex-col justify-center">
              <h3 className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wider">
                Network Stats
              </h3>
              <StatsPanel stats={stats} />
            </div>
          </div>

          {/* RIGHT COLUMN: Packet Sniffer (Full Height) */}
          <div className="flex-1 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden flex flex-col">
            <div className="p-3 bg-gray-800/50 border-b border-gray-700 font-semibold text-sm text-gray-400 flex justify-between items-center">
              <span>Packet Sniffer</span>
              <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                Live Capture
              </span>
            </div>
            <div className="flex-1 overflow-auto p-0 relative">
              <SnifferLog logs={logs} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
