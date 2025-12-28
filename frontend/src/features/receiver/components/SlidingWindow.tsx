import type React from 'react';
import { useEffect, useState } from 'react';

import type { WindowState } from '../types';

/**
 * A real-time visualizer for the sliding window flow control mechanism.
 */
const SlidingWindow: React.FC = () => {
  const [state, setState] = useState<WindowState | null>(null);

  useEffect(() => {
    window.api.onWindowUpdate((data) => {
      setState(data as WindowState);
    });
  }, []);

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p>Waiting for transfer to start...</p>
      </div>
    );
  }

  const progress = Math.min(100, (state.next_seq / state.total) * 100);
  const windowWidthPercent = Math.min(100, (state.window_size / state.total) * 100);
  const windowStartPercent = Math.min(100, (state.base / state.total) * 100);

  return (
    <div className="w-full h-full flex flex-col p-4">
      <h3 className="text-lg font-semibold text-gray-200 mb-6">Sliding Window Visualizer</h3>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatBox label="Window Base (ACKed)" value={state.base} color="text-green-400" />
        <StatBox label="Next Seq Num" value={state.next_seq} color="text-yellow-400" />
        <StatBox
          label="Bytes in Flight"
          value={state.next_seq - state.base}
          color="text-blue-400"
        />
      </div>

      <div className="relative w-full h-12 bg-gray-800 rounded-lg overflow-hidden border border-gray-700 mb-2">
        <div
          className="absolute top-0 left-0 h-full bg-green-900/30 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>

        <div
          className="absolute top-0 h-full border-2 border-blue-500 bg-blue-500/10 transition-all duration-300 ease-out flex items-center justify-center"
          style={{
            left: `${windowStartPercent}%`,
            width: `${windowWidthPercent}%`,
          }}
        >
          <span className="text-xs font-bold text-blue-300 whitespace-nowrap px-1">Window</span>
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-500 font-mono">
        <span>0 bytes</span>
        <span>{state.total} bytes</span>
      </div>

      <div className="mt-8 p-4 bg-gray-900 rounded-lg border border-gray-800">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Legend</h4>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-900/30 border border-green-900"></div>
            <span className="text-gray-400">Sent & Acked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500/10 border border-blue-500"></div>
            <span className="text-gray-400">Active Window (In Flight)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
    <div className={`text-xl font-mono font-bold ${color}`}>{value.toLocaleString()}</div>
  </div>
);

export default SlidingWindow;
