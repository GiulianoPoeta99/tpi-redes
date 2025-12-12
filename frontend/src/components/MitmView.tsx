import { Activity, Network, PlayCircle, ShieldAlert, StopCircle, Search } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import Button from './common/Button';
import GlassCard from './common/GlassCard';
import InputGroup from './common/InputGroup';
import ScanModal from './ScanModal';

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
  const isAttacking = isRunning && config.corruption > 0;
  const [stats, setStats] = useState({ intercepted: 0, corrupted: 0 });

  // Discovery
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  // biome-ignore lint/suspicious/noExplicitAny: Discovery peer type
  const [discoveredPeers, setDiscoveredPeers] = useState<any[]>([]);
  const [scanError, setScanError] = useState<string>();

  useEffect(() => {
    setBusy(isRunning);
  }, [isRunning, setBusy]);

  const openScan = async () => {
    setIsScanOpen(true);
    setIsScanning(true);
    setScanError(undefined);
    setDiscoveredPeers([]);
    try {
      const peers = await window.api.scanNetwork();
      setDiscoveredPeers(peers || []);
      // biome-ignore lint/suspicious/noExplicitAny: Error
    } catch (e: any) {
      setScanError(e.toString());
    } finally {
      setIsScanning(false);
    }
  };

  // biome-ignore lint/suspicious/noExplicitAny: Peer object
  const handleSelectPeer = (peer: any) => {
    setConfig((prev) => ({
      ...prev,
      targetIp: peer.ip,
      targetPort: peer.port || prev.targetPort,
    }));
    setIsScanOpen(false);
  };

  // Fake Stats Simulation
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setStats((prev) => ({
        intercepted: prev.intercepted + Math.floor(Math.random() * 8) + 2,
        corrupted:
          prev.corrupted +
          (config.corruption > 0 && Math.random() < config.corruption
            ? Math.floor(Math.random() * 3) + 1
            : 0),
      }));
    }, 500); // Update every 500ms
    return () => clearInterval(interval);
  }, [isRunning, config.corruption]);

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
        setStats({ intercepted: 0, corrupted: 0 }); // Reset stats
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
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <ScanModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onSelect={handleSelectPeer}
        scanning={isScanning}
        peers={discoveredPeers}
        error={scanError}
      />
      {/* Network Configuration */}
      <GlassCard title="Network Configuration" icon={Network}>
        <div className="flex items-start gap-4">
          {/* Listener: Fixed Width */}
          <div className="w-64 shrink-0">
            <InputGroup label="Proxy Listener" indicatorColor="bg-green-500">
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
            </InputGroup>
          </div>

          {/* Flow Animation: Flexible Space */}
          <div className="flex-1 flex flex-col justify-center px-4 relative h-full pt-8 group">
            <style>
              {`
                @keyframes flow-animation {
                  to {
                    stroke-dashoffset: -20;
                  }
                }
                .flow-active {
                  animation: flow-animation 0.5s linear infinite;
                }
                .flow-attacking {
                  animation: flow-animation 0.2s linear infinite;
                }
              `}
            </style>

            <div className="relative w-full h-8 flex items-center">
              {/* Connection Points */}
              <div
                className={`w-2 h-2 rounded-full ${
                  isRunning
                    ? isAttacking
                      ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                      : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                    : 'bg-gray-700'
                } absolute left-0 z-10`}
              ></div>
              <div
                className={`w-2 h-2 rounded-full ${
                  isRunning
                    ? isAttacking
                      ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                      : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                    : 'bg-gray-700'
                } absolute right-0 z-10`}
              ></div>

              <svg
                className="w-full h-full overflow-visible"
                aria-label="Packet Flow Visualization"
                role="img"
              >
                <title>Packet Flow</title>
                <line
                  x1="0"
                  y1="50%"
                  x2="100%"
                  y2="50%"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="10 10"
                  className={`transition-colors duration-300 ${
                    isRunning
                      ? isAttacking
                        ? 'text-red-500 flow-attacking opacity-100'
                        : 'text-green-500 flow-active opacity-80'
                      : 'text-gray-700 opacity-30'
                  }`}
                />
              </svg>

              {/* Status Label */}
              {isRunning && (
                <div
                  className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-[10px] font-mono font-bold tracking-widest px-2 rounded border bg-gray-900/80 ${
                    isAttacking
                      ? 'text-red-500 border-red-500/20'
                      : 'text-green-500 border-green-500/20'
                  }`}
                >
                  {isAttacking ? 'ATTACKING' : 'INTERCEPTING'}
                </div>
              )}
            </div>
          </div>

          {/* Target: Fixed Width */}
          <div className="w-80 shrink-0">
            <InputGroup label="Forward Target" indicatorColor="bg-blue-500">
              <div className="flex gap-2 w-full items-end">
                <div className="flex-1">
                  <span className="text-xs text-gray-400 block mb-1">Target Host / IP</span>
                  <input
                    type="text"
                    disabled={isRunning}
                    value={config.targetIp}
                    onChange={(e) => setConfig({ ...config, targetIp: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                </div>
                <div className="w-20">
                  <span className="text-xs text-gray-400 block mb-1">Port</span>
                  <input
                    type="number"
                    disabled={isRunning}
                    value={config.targetPort}
                    onChange={(e) => setConfig({ ...config, targetPort: Number(e.target.value) })}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={openScan}
                  disabled={isRunning}
                  className="text-blue-400 border-gray-600 shrink-0 h-[42px] w-[42px]"
                  title="Scan Network"
                  icon={<Search size={18} />}
                />
              </div>
            </InputGroup>
          </div>
        </div>
      </GlassCard>

      {/* Attack Configuration */}
      <GlassCard title="Active Attacks" icon={ShieldAlert} className="flex-1 flex flex-col">
        <div className="flex flex-col h-full gap-4">
          {/* Slider & Presets Section */}
          <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <label htmlFor="corruption-slider" className="text-sm font-bold text-gray-300">
                Data Corruption Rate
              </label>
              <span
                className={`text-2xl font-mono font-bold transition-colors ${
                  config.corruption > 0 ? 'text-red-500' : 'text-gray-500'
                }`}
              >
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
            <div className="flex justify-between text-xs text-gray-500 font-mono px-1">
              <span>Passthrough</span>
              <span>Noise</span>
              <span>Destructive</span>
            </div>

            {/* Intensity Presets */}
            <div className="flex gap-2">
              {[
                {
                  label: 'Bit Flip',
                  val: 0.01,
                  color: 'hover:bg-yellow-900/50 border-yellow-700 text-yellow-500',
                },
                {
                  label: 'Noise',
                  val: 0.2,
                  color: 'hover:bg-orange-900/50 border-orange-700 text-orange-500',
                },
                {
                  label: 'Fuzz',
                  val: 0.8,
                  color: 'hover:bg-red-900/50 border-red-700 text-red-500',
                },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => !isRunning && setConfig({ ...config, corruption: p.val })}
                  disabled={isRunning}
                  className={`flex-1 py-1.5 text-xs font-mono border rounded transition-all bg-gray-800/50 disabled:opacity-50 disabled:cursor-not-allowed ${p.color}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats & Mode Info */}
          <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-800 flex flex-col gap-3 flex-1 min-h-0">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Operational Mode
              </span>
              <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                DATA CORRUPTION ONLY
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1 items-center">
              <div className="flex flex-col items-center justify-center">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                  Intercepted
                </span>
                <span className="text-3xl font-mono text-green-500 tracking-tight">
                  {stats.intercepted.toLocaleString().padStart(5, '0')}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center border-l border-gray-800">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                  Corrupted
                </span>
                <span
                  className={`text-3xl font-mono tracking-tight ${
                    stats.corrupted > 0 ? 'text-red-500' : 'text-gray-600'
                  }`}
                >
                  {stats.corrupted.toLocaleString().padStart(5, '0')}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={toggleMitm}
            variant={isRunning ? 'danger' : 'primary'}
            size="lg"
            className={`w-full py-3 text-lg font-bold shadow-xl justify-center shrink-0 ${
              isRunning
                ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20 ring-red-500'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
            }`}
            icon={isRunning ? <StopCircle size={24} /> : <PlayCircle size={24} />}
          >
            {isRunning ? 'STOP PROXY' : 'START PROXY'}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
};

export default MitmView;
