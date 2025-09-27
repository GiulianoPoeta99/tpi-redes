import type React from 'react';
import { useState } from 'react';

// Simplified MITM View for now - reusing existing proxy logic triggers would be ideal
// But for Phase 12 we just want the layout.
const MitmView: React.FC = () => {
  const [config, setConfig] = useState({
    listenPort: 8081,
    targetIp: '127.0.0.1',
    targetPort: 8080,
    corruption: 0.0,
  });
  const [isRunning, setIsRunning] = useState(false);

  const toggleMitm = async () => {
    if (isRunning) {
      await window.api.stopProcess();
      setIsRunning(false);
    } else {
      try {
        await window.api.startProxy({
          listenPort: config.listenPort,
          targetIp: config.targetIp,
          targetPort: config.targetPort,
          corruptionRate: config.corruption,
        });
        setIsRunning(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="h-full flex flex-col justify-between">
      <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl mb-6">
        <h3 className="text-red-400 font-bold flex items-center gap-2">⚠️ Man-In-The-Middle Mode</h3>
        <p className="text-xs text-red-300 mt-1">
          This mode intercepts traffic. Ensure you have 3 distinct terminals/nodes if testing
          locally, or use this instance as the specialized Proxy node.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-gray-500 uppercase">Listener Config</h4>
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Listen Port
              <input
                type="number"
                value={config.listenPort}
                onChange={(e) => setConfig({ ...config, listenPort: Number(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-white mt-1"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-bold text-gray-500 uppercase">Target Config</h4>
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Target IP
              <input
                value={config.targetIp}
                onChange={(e) => setConfig({ ...config, targetIp: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-white mt-1"
              />
            </label>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Target Port
              <input
                type="number"
                value={config.targetPort}
                onChange={(e) => setConfig({ ...config, targetPort: Number(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-white mt-1"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-gray-900 rounded-xl border border-gray-700">
        <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Attack Vectors</h4>
        <div>
          <label className="text-xs text-gray-400 block mb-1">
            Data Corruption Rate ({config.corruption * 100}%)
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.corruption}
              onChange={(e) => setConfig({ ...config, corruption: Number(e.target.value) })}
              className="w-full mt-2 accent-red-500"
            />
          </label>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0% (Pass-through)</span>
            <span>100% (Garbage)</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={toggleMitm}
          className={`px-8 py-3 rounded-xl font-bold font-mono transition-all ${isRunning ? 'bg-red-600 animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          {isRunning ? 'STOP PROXY' : 'START PROXY'}
        </button>
      </div>
    </div>
  );
};

export default MitmView;
