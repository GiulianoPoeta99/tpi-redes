import { ShieldAlert } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import HeaderStatusCard from '../shared/components/HeaderStatusCard';
import ScanModal from '../shared/components/ScanModal';
import { useDiscovery } from '../shared/hooks/useDiscovery';
import ActiveAttacks from './components/ActiveAttacks';
import MitmNetworkConfig from './components/MitmNetworkConfig';
import type { MitmConfig } from './types';

const MitmView: React.FC<{
  setBusy: (busy: boolean) => void;
  setHeaderContent: (content: React.ReactNode) => void;
  addToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}> = ({ setBusy, setHeaderContent, addToast }) => {
  const [config, setConfig] = useState<MitmConfig>({
    listenPort: 8081,
    targetIp: '127.0.0.1',
    targetPort: 8080,
    corruption: 0.0,
    protocol: 'tcp',
  });
  const [isRunning, setIsRunning] = useState(false);
  const isAttacking = isRunning && config.corruption > 0;
  const [stats, setStats] = useState({ intercepted: 0, corrupted: 0 });

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

  useEffect(() => {
    if (!isRunning) return;

    const cleanupPacket = window.api.onPacketCapture(() => {
      setStats((prev) => ({ ...prev, intercepted: prev.intercepted + 1 }));
    });

    const cleanupLog = window.api.onLog?.((log: string) => {
      if (log.includes('Corrupting') || log.includes('Corrupted')) {
        setStats((prev) => ({ ...prev, corrupted: prev.corrupted + 1 }));
      }
    });

    return () => {
      cleanupPacket();
      cleanupLog?.();
    };
  }, [isRunning]);

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

  useEffect(() => {
    const cleanupExit = window.api.onProcessExit?.((data: { code: number }) => {
      if (isRunning) {
        setIsRunning(false);
        if (data.code !== 0) {
          addToast('error', 'Proxy Stopped', `Process exited (Code: ${data.code}). Check ports.`);
        }
      }
    });

    return () => cleanupExit?.();
  }, [isRunning, addToast]);

  const toggleMitm = async () => {
    if (isRunning) {
      await window.api.stopProcess();
      setIsRunning(false);
    } else {
      try {
        setStats({ intercepted: 0, corrupted: 0 });
        await window.api.startProxy({
          listenPort: Number(config.listenPort),
          targetIp: config.targetIp,
          targetPort: Number(config.targetPort),
          corruptionRate: config.corruption,
          interfaceName: config.interface,
          protocol: config.protocol,
        });
        setIsRunning(true);
      } catch (e) {
        console.error(e);
        addToast('error', 'Start Failed', 'Failed to start proxy engine.');
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
