import { Clock, Folder, Network } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { AppStats } from '../../services/StorageService';
import { StorageService } from '../../services/StorageService';
import SnifferLog from '../mitm/components/SnifferLog';
import MitmView from '../mitm/MitmView';
import { ReceivedFilesModal } from '../receiver/components/ReceivedFilesModal';
import ReceiverView from '../receiver/ReceiverView';
import HeaderActionButton from '../shared/components/HeaderActionButton';
import IpDisplay from '../shared/components/IpDisplay';
import ModeSelector from '../shared/components/ModeSelector';
import ToastContainer, { type ToastMessage } from '../shared/components/Toast';
import type { Packet } from '../shared/types';
import TransmitterView from '../transmitter/TransmitterView';
import HistoryModal from './components/HistoryModal';
import StatsPanel from './components/StatsPanel';

// Dashboard "Desktop" Layout with 3 modes + Persistent Sidebars
const Dashboard: React.FC = () => {
  const [mode, setMode] = useState<'receiver' | 'transmitter' | 'mitm'>('receiver');
  const [stats, setStats] = useState<AppStats>(StorageService.loadStats());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [logs, setLogs] = useState<{ id: string; text: string; type?: string }[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [headerContent, setHeaderContent] = useState<React.ReactNode>(null);

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
    const cleanupStats = window.api.onStatsUpdate((data: unknown) => {
      const newStats = data as { total_sent?: number; bytes_sent?: number; delta_bytes?: number };
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
    });

    // Global Log Listener for Toasts & Sniffer
    // We filter specific events that deserve a global toast
    const cleanupLog = window.api.onLog((log: string) => {
      try {
        const parsed = JSON.parse(log);
        const events = Array.isArray(parsed) ? parsed : [parsed];

        // Flatten batched events into individual log strings for SnifferLog
        // Filter out high-frequency events that have their own UI components (PacketTable, StatsPanel)
        const newLogLines = events
          .filter((e: unknown) => {
            if (typeof e === 'object' && e !== null && 'type' in e && typeof e.type === 'string') {
              return !['PACKET_CAPTURE', 'STATS', 'WINDOW_UPDATE'].includes(e.type);
            }
            return true; // Include if type is not a string or not present
          })
          .map((e: unknown) => ({
            id: crypto.randomUUID(),
            text: JSON.stringify(e),
            type: (e as { type?: string }).type || 'UNKNOWN',
          }));

        if (newLogLines.length > 0) {
          setLogs((prev) => [...prev, ...newLogLines]);
        }

        events.forEach((json: unknown) => {
          // Type guard or cast logic would go here, currently casting loosely for refactor
          const event = json as {
            type?: string;
            message?: string;
            port?: number;
            status?: string;
            filename?: string;
          };

          if (event.type === 'ERROR') {
            addToast('error', 'Error', event.message);
          } else if (event.type === 'SERVER_READY') {
            addToast('success', 'Server Started', `Listening on port ${event.port}`);
          } else if (event.type === 'TRANSFER_UPDATE' && event.status === 'complete') {
            addToast('success', 'Transfer Complete', event.filename);
            setStats((prev) => {
              const updated = { ...prev, totalSent: prev.totalSent + 1 };
              StorageService.saveStats(updated);
              return updated;
            });
          }
        });
      } catch (_e) {
        // Fallback for non-JSON logs or parse errors
        setLogs((prev) => [...prev, { id: crypto.randomUUID(), text: log, type: 'RAW' }]);
      }
    });

    // Packet Listener for Real-time Stats
    const cleanupPackets = window.api.onPacketCapture((data) => {
      const packet = data as Packet;
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
        <header className="bg-white/5 border-b border-white/10 backdrop-blur-md p-4 flex items-center justify-between z-10 sticky top-0">
          {/* Left: Brand & Modes */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 group cursor-default">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
                <Network className="text-white" size={24} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-white leading-tight tracking-tight group-hover:text-blue-200 transition-colors">
                  TPI Redes
                </h1>
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold group-hover:text-gray-300 transition-colors">
                  Network Manager
                </span>
              </div>
            </div>

            {/* Segmented Control */}
            <ModeSelector
              currentMode={mode}
              onModeChange={(m) => handleModeSwitch(m)}
              isBusy={isBusy}
            />

            <div className="w-px h-8 bg-white/10"></div>

            <div className="flex items-center gap-3">
              <HeaderActionButton
                label="Files"
                icon={Folder}
                color="blue"
                onClick={() => setShowFiles(true)}
              />

              <HeaderActionButton
                label="History"
                icon={Clock}
                color="purple"
                onClick={() => setShowHistory(true)}
              />
            </div>
          </div>

          {/* Right: Header Content & Actions */}
          <div className="flex items-stretch gap-4">
            <IpDisplay variant="gray" className="h-full" />
            {headerContent}
          </div>
        </header>

        {/* Main Content Area - Grid Layout */}
        <main className="flex-1 p-6 overflow-hidden flex gap-6">
          {/* LEFT COLUMN: Modes (55%) */}
          <div className="flex-[55] bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-6 relative overflow-hidden flex flex-col">
            <div className="h-full overflow-y-auto">
              {mode === 'receiver' && (
                <ReceiverView setBusy={setIsBusy} setHeaderContent={setHeaderContent} />
              )}
              {mode === 'transmitter' && (
                <TransmitterView
                  setBusy={setIsBusy}
                  addToast={addToast}
                  setHeaderContent={setHeaderContent}
                />
              )}
              {mode === 'mitm' && (
                <MitmView setBusy={setIsBusy} setHeaderContent={setHeaderContent} />
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Stats + Sniffer (45%) */}
          <div className="flex-[45] flex flex-col gap-6 min-w-0">
            {/* Statistics Widget */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-4 flex flex-col justify-center shrink-0">
              <h3 className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wider">
                Network Stats
              </h3>
              <StatsPanel stats={stats} />
            </div>

            {/* Packet Sniffer */}
            <div className="flex-1 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden flex flex-col min-h-0">
              <SnifferLog logs={logs} mode={mode} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
