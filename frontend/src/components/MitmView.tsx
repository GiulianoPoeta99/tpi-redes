import { Activity, Network, Play, Settings, ShieldAlert, Square } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

interface MitmConfig {
  listenPort: number;
  targetIp: string;
  targetPort: number;
  corruption: number;
}

const MitmView: React.FC<{
  setBusy: (busy: boolean) => void;
  setHeaderContent: (content: React.ReactNode) => void;
}> = ({ setBusy, setHeaderContent }) => {
  const [config, setConfig] = useState<MitmConfig>({
    listenPort: 8081,
    targetIp: '127.0.0.1',
    targetPort: 8080,
    corruption: 0.0,
  });
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setBusy(isRunning);
  }, [isRunning, setBusy]);

  // Lift Header Content
  useEffect(() => {
    setHeaderContent(
      <div className="min-w-[400px] bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-500/30 p-3 rounded-xl flex items-center justify-between shadow-lg gap-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={20} />
            MITM Proxy
          </h2>
          <p className="text-red-200/60 text-xs">Intercept & Manipulate</p>
        </div>
        <div
          className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
            isRunning
              ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
              : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}
        >
          <Activity size={16} />
          <span className="font-mono font-bold text-xs">{isRunning ? 'ACTIVE' : 'IDLE'}</span>
        </div>
      </div>,
    );
    return () => setHeaderContent(null);
  }, [isRunning, setHeaderContent]);

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
    <div className="h-full flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Configuration Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Network size={20} />
            </div>
            <h3 className="font-bold text-gray-200">Network Configuration</h3>
          </div>

          <div className="space-y-6 flex-1">
            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
              <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Proxy Listener
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <span className="text-xs text-gray-400 block mb-1">Local Port</span>
                  <input
                    type="number"
                    disabled={isRunning}
                    value={config.listenPort}
                    onChange={(e) => setConfig({ ...config, listenPort: Number(e.target.value) })}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center -my-2 opacity-30">
              <div className="h-8 w-0.5 bg-gray-500"></div>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
              <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Forward Target
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <span className="text-xs text-gray-400 block mb-1">Target Host / IP</span>
                  <input
                    type="text"
                    disabled={isRunning}
                    value={config.targetIp}
                    onChange={(e) => setConfig({ ...config, targetIp: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                </div>
                <div>
                  <span className="text-xs text-gray-400 block mb-1">Port</span>
                  <input
                    type="number"
                    disabled={isRunning}
                    value={config.targetPort}
                    onChange={(e) => setConfig({ ...config, targetPort: Number(e.target.value) })}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attack Vector Card */}
        <div className="flex flex-col gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
              <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                <Settings size={20} />
              </div>
              <h3 className="font-bold text-gray-200">Active Attacks</h3>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700/50">
                <div className="flex justify-between items-end mb-4">
                  <label htmlFor="corruption-slider" className="text-sm font-bold text-gray-300">
                    Data Corruption Rate
                  </label>
                  <span className="text-2xl font-mono font-bold text-red-500">
                    {Math.round(config.corruption * 100)}%
                  </span>
                </div>

                <input
                  id="corruption-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  disabled={isRunning}
                  value={config.corruption}
                  onChange={(e) => setConfig({ ...config, corruption: Number(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2 font-mono">
                  <span>Passthrough</span>
                  <span>Noise</span>
                  <span>Destructive</span>
                </div>

                <p className="text-xs text-gray-500 mt-4 border-l-2 border-red-500/30 pl-3">
                  Currently supporting random bit-flip corruption. Higher rates will likely break
                  TCP checksums unless re-calculated by the Proxy. (Note: Current Proxy
                  implementation preserves payload length but flips bits).
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleMitm}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 ${
              isRunning
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
            }`}
          >
            {isRunning ? (
              <>
                <Square className="fill-current" size={20} /> STOP PROXY
              </>
            ) : (
              <>
                <Play className="fill-current" size={20} /> START PROXY
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MitmView;
