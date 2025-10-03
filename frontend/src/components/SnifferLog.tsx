import { ChevronLeft, ChevronRight } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import PacketTable from './PacketTable';

interface SnifferLogProps {
  logs: string[];
}

const ITEMS_PER_PAGE = 50;

const SnifferLog: React.FC<SnifferLogProps> = ({ logs }) => {
  const [viewMode, setViewMode] = useState<'raw' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const logEndRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(logs.length / ITEMS_PER_PAGE));

  // Auto-advance page if we were on the last page
  useEffect(() => {
    setCurrentPage((prev) => {
      // If we were on the last page (or close to it), follow the tail
      const prevTotal = Math.ceil(Math.max(0, logs.length - 1) / ITEMS_PER_PAGE);
      // If we are on a valid page less than total, and new logs came in,
      // we might want to stay unless we were at the end.
      // Simple logic: If we are at the end, stay at the end.
      // Wait, 'prev' is the page number.
      // If I was on page 5/5, and now it's 6/6, I should go to 6.
      if (prev >= prevTotal) return totalPages;
      return prev;
    });
  }, [logs.length, totalPages]);

  // Effect for scrolling to bottom of current page
  // biome-ignore lint/correctness/useExhaustiveDependencies: Scroll on new logs
  useEffect(() => {
    // Only scroll if we are on raw view and looking at the latest page
    if (viewMode === 'raw' && currentPage === totalPages) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, viewMode, currentPage, totalPages]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visibleLogs = logs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-mono text-gray-400">Network Traffic</h2>

          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-gray-700 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'raw'
                  ? 'bg-gray-700 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Raw
            </button>
          </div>
        </div>

        {viewMode === 'raw' && (
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/50 rounded-lg p-1 border border-gray-700/50">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 hover:bg-gray-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-mono min-w-[60px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 hover:bg-gray-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 p-1 ${viewMode === 'table' ? 'block' : 'hidden'}`}>
          <PacketTable />
        </div>
        <div
          className={`absolute inset-0 p-4 overflow-y-auto font-mono text-xs space-y-1 ${viewMode === 'raw' ? 'block' : 'hidden'}`}
        >
          {logs.length === 0 && <div className="text-gray-600 italic">Waiting for activity...</div>}
          {visibleLogs.map((log, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Immutable logs slice
            <div key={startIndex + i} className={`${getLogColor(log)} break-all`}>
              {stripAnsi(log)}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Needed for ANSI stripping
  return str.replace(/\x1B\[[0-9;]*[mK]/g, '');
}

function getLogColor(log: string): string {
  const cleanLog = stripAnsi(log);
  // Check for log levels inside the message first
  if (cleanLog.includes('INFO')) return 'text-cyan-400';
  if (cleanLog.includes('WARNING')) return 'text-yellow-400';
  if (cleanLog.includes('ERROR') || cleanLog.includes('Error:')) return 'text-red-400';
  if (cleanLog.includes('Starting')) return 'text-green-400';
  return 'text-gray-300';
}

export default SnifferLog;
