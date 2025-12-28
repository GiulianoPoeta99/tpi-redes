import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Packet } from '../../shared/types';
import ExpandedPacketModal from './ExpandedPacketModal';
import PacketTable from './PacketTable';
import SnifferControls from './SnifferControls';
import SnifferPermissionModal from './SnifferPermissionModal';
import SnifferRawLog from './SnifferRawLog';

/**
 * Props for SnifferLog.
 */
interface SnifferLogProps {
  logs: { id: string; text: string; type?: string }[];
  mode: 'receiver' | 'transmitter' | 'mitm';
}

const ITEMS_PER_PAGE = 50;

/**
 * Component to display trapped network packets in a log or table view.
 * Handles pagination, auto-scrolling, and packet capture updates.
 */
const SnifferLog: React.FC<SnifferLogProps> = ({ logs, mode }) => {
  const [viewMode, setViewMode] = useState<'raw' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [packets, setPackets] = useState<Packet[]>([]);
  const [paused, setPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    const cleanup = window.api.onPacketCapture((packet) => {
      if (!paused) {
        setPackets((prev) => [...prev, { ...(packet as Packet), mode }]);
      }
    });
    return cleanup;
  }, [paused, mode]);

  useEffect(() => {
    const cleanupError = window.api.onSnifferError((err: unknown) => {
      console.error(err);
      setPermissionError(true);
    });
    return cleanupError;
  }, []);

  const totalPages = Math.max(1, Math.ceil(logs.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage((prev) => {
      const prevTotal = Math.ceil(Math.max(0, logs.length - 1) / ITEMS_PER_PAGE);
      if (prev >= prevTotal) return totalPages;
      return prev;
    });
  }, [logs.length, totalPages]);

  useEffect(() => {
    if (viewMode === 'raw' && currentPage === totalPages) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [viewMode, currentPage, totalPages]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visibleLogs = logs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      <SnifferPermissionModal
        isOpen={permissionError}
        onDismiss={() => setPermissionError(false)}
      />

      <ExpandedPacketModal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        packets={packets}
      />

      <SnifferControls
        viewMode={viewMode}
        setViewMode={setViewMode}
        packetCount={packets.length}
        logCount={logs.length}
        paused={paused}
        setPaused={setPaused}
        onClear={() => setPackets([])}
        onExpand={() => setIsExpanded(true)}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />

      <div className="flex-1 overflow-hidden relative bg-black/20">
        <div className={`absolute inset-0 ${viewMode === 'table' ? 'block' : 'hidden'}`}>
          <PacketTable packets={packets} />
        </div>
        <SnifferRawLog logs={visibleLogs} visible={viewMode === 'raw'} logEndRef={logEndRef} />
      </div>
    </div>
  );
};

export default SnifferLog;
