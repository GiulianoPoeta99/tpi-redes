import { Activity, Network, PlayCircle, ShieldAlert, StopCircle } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import SubmitButton from './common/SubmitButton';
import CorruptionSlider from './common/CorruptionSlider';
import GlassCard from './common/GlassCard';
import MitmProxyConfig from './common/MitmProxyConfig';
import MitmStatsConfig from './common/MitmStatsConfig';
import MitmTargetConfig from './common/MitmTargetConfig';
import ScanModal from './ScanModal';

interface MitmConfig {
  listenPort: number | string;
  targetIp: string;
  targetPort: number | string;
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
      <div className="min-w-[400px] bg-gradient-to-r from-mode-mitm-dim to-orange-900/40 border border-mode-mitm/30 p-3 rounded-xl flex items-center justify-between shadow-lg gap-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="text-mode-mitm" size={20} />
            MITM Proxy
          </h2>
          <p className="text-red-200/60 text-xs">Intercept & Manipulate</p>
        </div>
        <div
          className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
            isRunning
              ? 'bg-green-500/20 border-green-500 text-green-400 animate-pulse'
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
          listenPort: Number(config.listenPort),
          targetIp: config.targetIp,
          targetPort: Number(config.targetPort),
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
            <MitmProxyConfig
              listenPort={config.listenPort}
              onChange={(val) => setConfig({ ...config, listenPort: val })}
              disabled={isRunning}
            />
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
          <div className="w-96 shrink-0">
            <MitmTargetConfig
              targetIp={config.targetIp}
              targetPort={config.targetPort}
              onIpChange={(val) => setConfig({ ...config, targetIp: val })}
              onPortChange={(val) => setConfig({ ...config, targetPort: val })}
              onScanClick={openScan}
              disabled={isRunning}
            />
          </div>
        </div>
      </GlassCard>

      {/* Attack Configuration */}
      <GlassCard title="Active Attacks" icon={ShieldAlert} className="flex-1 flex flex-col">
        <div className="flex flex-col h-full gap-4">
          {/* Slider & Presets Section */}
          <CorruptionSlider
            value={config.corruption}
            onChange={(val) => setConfig({ ...config, corruption: val })}
            disabled={isRunning}
          />

          {/* Stats & Mode Info */}
          <MitmStatsConfig
            stats={stats}
            isActive={isRunning}
            className="flex-1 min-h-0"
          />

          <SubmitButton
            onClick={toggleMitm}
            variant={isRunning ? 'danger' : 'primary'}
            className={`text-white ${
              isRunning
                ? 'bg-red-600 hover:bg-red-500 ring-red-500 shadow-red-900/20'
                : 'bg-blue-600 hover:bg-blue-500 ring-blue-500 shadow-blue-900/20'
            }`}
            icon={isRunning ? <StopCircle size={24} /> : <PlayCircle size={24} />}
          >
            {isRunning ? 'STOP PROXY' : 'START PROXY'}
          </SubmitButton>
        </div>
      </GlassCard>
    </div>
  );
};

export default MitmView;
