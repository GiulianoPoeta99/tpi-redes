import {
  ChevronLeft,
  ChevronRight,
  FileText,
  List,
  Maximize2,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import type React from 'react';

interface SnifferControlsProps {
  viewMode: 'raw' | 'table';
  setViewMode: (mode: 'raw' | 'table') => void;
  packetCount: number;
  logCount: number;
  paused: boolean;
  setPaused: (paused: boolean) => void;
  onClear: () => void;
  onExpand: () => void;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
}

const SnifferControls: React.FC<SnifferControlsProps> = ({
  viewMode,
  setViewMode,
  packetCount,
  logCount,
  paused,
  setPaused,
  onClear,
  onExpand,
  currentPage,
  totalPages,
  setCurrentPage,
}) => {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex justify-between items-center shrink-0 shadow-md z-10">
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-gray-200 flex items-center gap-2">
          Packet Sniffer
          <span className="text-xs font-mono font-normal bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
            {viewMode === 'table' ? packetCount : logCount}
          </span>
        </h2>

        {/* View Toggles */}
        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700/50">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-2 transition-all cursor-pointer ${
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
            className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-2 transition-all cursor-pointer ${
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
            className={`p-2 rounded-lg transition-colors cursor-pointer ${paused ? 'bg-yellow-500/10 text-yellow-400' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
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
            onClick={onClear}
            className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors cursor-pointer"
            title="Clear Packets"
            type="button"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onExpand}
            className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-gray-700 transition-colors cursor-pointer"
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
              className="p-1 hover:bg-gray-700 rounded disabled:opacity-30 cursor-pointer"
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
              className="p-1 hover:bg-gray-700 rounded disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SnifferControls;
