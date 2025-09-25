import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import PacketTable from './PacketTable';

const SnifferLog: React.FC = () => {
  const [viewMode, setViewMode] = useState<'raw' | 'table'>('table');
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to logs
    window.api.onLog((log) => {
      setLogs((prev) => [...prev, log]);
    });
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom only in raw view
    if (viewMode === 'raw') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, viewMode]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-mono text-gray-400">Network Traffic</h2>

          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'raw'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Raw
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Traffic Lights Decoration */}
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'table' ? (
          <div className="absolute inset-0 p-1">
            <PacketTable />
          </div>
        ) : (
          <div className="absolute inset-0 p-4 overflow-y-auto font-mono text-xs space-y-1">
            {logs.length === 0 && (
              <div className="text-gray-600 italic">Waiting for activity...</div>
            )}
            {logs.map((log, i) => (
              <div key={i} className={`${getLogColor(log)} break-all`}>
                {log}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

function getLogColor(log: string): string {
  if (log.includes('ERROR')) return 'text-red-400';
  if (log.includes('SNIFFER')) return 'text-cyan-400';
  if (log.includes('WARNING')) return 'text-yellow-400';
  if (log.includes('Starting')) return 'text-green-400';
  return 'text-gray-300';
}

export default SnifferLog;
