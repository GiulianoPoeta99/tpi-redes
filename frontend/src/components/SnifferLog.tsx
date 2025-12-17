import { ChevronLeft, ChevronRight, FileText, List, Maximize2, Pause, Play, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import type { Packet } from '../types';
import PacketTable from './PacketTable'; // Default Import
import ExpandedPacketModal from './ExpandedPacketModal';

interface SnifferLogProps {
  logs: string[];
  mode: 'receiver' | 'transmitter' | 'mitm';
}

const ITEMS_PER_PAGE = 50;

const SnifferLog: React.FC<SnifferLogProps> = ({ logs, mode }) => {
  const [viewMode, setViewMode] = useState<'raw' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Lifted Packet State
  const [packets, setPackets] = useState<Packet[]>([]);
  const [paused, setPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    const cleanup = window.api.onPacketCapture((packet) => {
      if (!paused) {
        setPackets((prev) => [...prev, { ...packet, mode }]);
      }
    });
    return cleanup;
  }, [paused, mode]);

  useEffect(() => {
    // biome-ignore lint/suspicious/noExplicitAny: Error event
    const cleanup = window.api.onSnifferError((_err: any) => {
      setPermissionError(true);
    });
    return cleanup;
  }, []);

  const totalPages = Math.max(1, Math.ceil(logs.length / ITEMS_PER_PAGE));

  // Auto-advance page if following tail
  useEffect(() => {
    setCurrentPage((prev) => {
      const prevTotal = Math.ceil(Math.max(0, logs.length - 1) / ITEMS_PER_PAGE);
      if (prev >= prevTotal) return totalPages;
      return prev;
    });
  }, [logs.length, totalPages]);

  // Scroll to bottom effect
  useEffect(() => {
    if (viewMode === 'raw' && currentPage === totalPages) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [viewMode, currentPage, totalPages]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visibleLogs = logs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      {permissionError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-red-500/50 rounded-xl p-6 max-w-md text-center shadow-2xl mx-4">
            <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
               {/* biome-ignore lint/a11y/noSvgWithoutTitle: Icon */}
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Permission Required</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Packet Sniffer requires <strong className="text-red-400">Root/Administrator</strong> privileges to capture raw network traffic.
            </p>
            <div className="bg-black/40 rounded p-3 mb-6 font-mono text-xs text-left text-gray-400 border border-gray-800">
               $ sudo just run
            </div>
            <button
              type="button"
              onClick={() => setPermissionError(false)}
              className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors border border-gray-700 font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <ExpandedPacketModal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        packets={packets}
      />
      {/* Unified Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex justify-between items-center shrink-0 shadow-md z-10">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-gray-200 flex items-center gap-2">
            Packet Sniffer
            <span className="text-xs font-mono font-normal bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
              {viewMode === 'table' ? packets.length : logs.length}
            </span>
          </h2>

          {/* View Toggles */}
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700/50">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-2 transition-all ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List size={14} /> Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-2 transition-all ${
                viewMode === 'raw'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText size={14} /> Raw
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Controls */}
          <div className="flex items-center gap-1 border-r border-gray-700 pr-3 mr-1">
            <button
              onClick={() => setPaused(!paused)}
              className={`p-2 rounded-lg transition-colors ${paused ? 'bg-yellow-500/10 text-yellow-400' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
              title={paused ? 'Resume Capture' : 'Pause Capture'}
              type="button"
            >
              {paused ? (
                <Play size={16} fill="currentColor" />
              ) : (
                <Pause size={16} fill="currentColor" />
              )}
            </button>
            <button
              onClick={() => {
                setPackets([]); /* Clear logs? No props for that yet */
              }}
              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
              title="Clear Packets"
              type="button"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setIsExpanded(true)}
              className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-gray-700 transition-colors"
              title="Expand View"
              type="button"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          {/* Pagination (Raw Mode Only) */}
          {viewMode === 'raw' && (
            <div className="flex items-center gap-1 text-xs font-mono bg-gray-900 p-1 rounded-lg border border-gray-700">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 hover:bg-gray-700 rounded disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="min-w-[50px] text-center text-gray-400">
                {currentPage}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 hover:bg-gray-700 rounded disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-black/20">
        <div className={`absolute inset-0 ${viewMode === 'table' ? 'block' : 'hidden'}`}>
          <PacketTable packets={packets} />
        </div>
        <div
          className={`absolute inset-0 p-4 overflow-y-auto font-mono text-xs space-y-1 ${viewMode === 'raw' ? 'block' : 'hidden'}`}
        >
          {logs.length === 0 && (
            <div className="text-gray-500 italic text-center mt-10">No logs captured yet...</div>
          )}
          {visibleLogs.map((log, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Logs have no unique IDs
            <React.Fragment key={startIndex + i}>
              <div className={`${getLogColor(log)} break-all border-b border-gray-800/30 pb-0.5`}>
                {stripAnsi(log)}
              </div>
            </React.Fragment>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escapes
  return str.replace(/\x1B\[[0-9;]*[mK]/g, '');
}

function getLogColor(log: string): string {
  const cleanLog = stripAnsi(log);
  if (cleanLog.includes('INFO')) return 'text-cyan-400';
  if (cleanLog.includes('WARNING')) return 'text-yellow-400';
  if (cleanLog.includes('ERROR') || cleanLog.includes('Error:')) return 'text-red-400';
  if (cleanLog.includes('Starting')) return 'text-green-400';
  return 'text-gray-300';
}

export default SnifferLog;
