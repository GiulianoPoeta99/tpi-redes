import { useCallback, useEffect, useState } from 'react';
import SnifferLog from '../mitm/components/SnifferLog';
import MitmView from '../mitm/MitmView';
import { ReceivedFilesModal } from '../receiver/components/ReceivedFilesModal';
import ReceiverView from '../receiver/ReceiverView';
import type { AppStats } from '../shared/services/StorageService';
import { StorageService } from '../shared/services/StorageService';
import type { Packet, ToastMessage } from '../shared/types';
import TransmitterView from '../transmitter/TransmitterView';
import DashboardHeader from './components/DashboardHeader';
import HistoryModal from './components/HistoryModal';
import StatsPanel from './components/StatsPanel';
import DashboardLayout from './DashboardLayout';

/**
 * Dashboard "Desktop" Layout with 3 modes + Persistent Sidebars.
 * Orchestrates the main application state, mode switching, global event listeners (logs, stats),
 * and layout composition.
 */
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
        return newToasts.slice(0, 3);
      });
    },
    [],
  );
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
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

    const cleanupLog = window.api.onLog((log: string) => {
      try {
        const parsed = JSON.parse(log);
        const events = Array.isArray(parsed) ? parsed : [parsed];

        const newLogLines = events
          .filter((e: unknown) => {
            if (typeof e === 'object' && e !== null && 'type' in e && typeof e.type === 'string') {
              return !['PACKET_CAPTURE', 'STATS', 'WINDOW_UPDATE'].includes(e.type);
            }
            return true;
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
        setLogs((prev) => [...prev, { id: crypto.randomUUID(), text: log, type: 'RAW' }]);
      }
    });

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

  const handleModeSwitch = async (newMode: 'receiver' | 'transmitter' | 'mitm') => {
    if (isBusy) {
      addToast('info', 'Action Required', 'Stop current operation before switching.');
      return;
    }
    if (mode === newMode) return;

    setLogs([]);

    try {
      await window.api.stopProcess();
      console.log('Stopped background process.');
    } catch (e) {
      console.error('Failed to stop process', e);
    }

    setMode(newMode);
  };

  return (
    <DashboardLayout
      toasts={toasts}
      removeToast={removeToast}
      modals={
        <>
          {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
          <ReceivedFilesModal isOpen={showFiles} onClose={() => setShowFiles(false)} />
        </>
      }
      header={
        <DashboardHeader
          mode={mode}
          onModeChange={handleModeSwitch}
          isBusy={isBusy}
          onShowFiles={() => setShowFiles(true)}
          onShowHistory={() => setShowHistory(true)}
          headerContent={headerContent}
        />
      }
      mainContent={
        <>
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
            <MitmView setBusy={setIsBusy} setHeaderContent={setHeaderContent} addToast={addToast} />
          )}
        </>
      }
      sideContent={
        <>
          <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-3 sm:p-4 flex flex-col justify-center shrink-0">
            <h3 className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wider">
              Network Stats
            </h3>
            <StatsPanel stats={stats} />
          </div>

          <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden flex flex-col min-h-[22rem] 2xl:min-h-0 2xl:flex-1">
            <SnifferLog logs={logs} mode={mode} />
          </div>
        </>
      }
    />
  );
};

export default Dashboard;
