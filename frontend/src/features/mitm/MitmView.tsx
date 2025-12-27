import { ShieldAlert } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import HeaderStatusCard from '../shared/components/HeaderStatusCard';
import ScanModal from '../shared/components/ScanModal';
import { useDiscovery } from '../shared/hooks/useDiscovery';
import ActiveAttacks from './components/ActiveAttacks';
import MitmNetworkConfig from './components/MitmNetworkConfig';

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
  const discovery = useDiscovery();

  useEffect(() => {
    setBusy(isRunning);
  }, [isRunning, setBusy]);

  const handleSelectPeer = (peer: { ip: string; port?: number }) => {
    setConfig((prev) => ({
      ...prev,
      targetIp: peer.ip,
      targetPort: peer.port || prev.targetPort,
    }));
    discovery.close();
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
      <HeaderStatusCard
        title="MITM Proxy"
        subtitle="Intercept & Manipulate"
        icon={ShieldAlert}
        variant="red"
        status={isRunning ? 'active' : 'idle'}
        statusLabel={isRunning ? 'ACTIVE' : 'IDLE'}
      />,
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
        isOpen={discovery.isOpen}
        onClose={discovery.close}
        onSelect={handleSelectPeer}
        scanning={discovery.scanning}
        peers={discovery.peers}
        error={discovery.error}
      />
      {/* Network Configuration */}
      <MitmNetworkConfig
        config={config}
        setConfig={setConfig}
        isRunning={isRunning}
        isAttacking={isAttacking}
        openScan={discovery.scan}
      />

      <ActiveAttacks
        config={config}
        setConfig={setConfig}
        isRunning={isRunning}
        stats={stats}
        toggleMitm={toggleMitm}
      />
    </div>
  );
};

export default MitmView;
