import { Send } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import StatsModal from '../dashboard/components/StatsModal';
import HeaderStatusCard from '../shared/components/HeaderStatusCard';
import ScanModal from '../shared/components/ScanModal';
import { useDiscovery } from '../shared/hooks/useDiscovery';
import AdvancedOptions from './components/AdvancedOptions';
import FilesQueueModal from './components/FilesQueueModal';
import NetworkConfiguration from './components/NetworkConfiguration';
import PayloadConfiguration from './components/PayloadConfiguration';
import TransferCompleteOverlay from './components/TransferCompleteOverlay';
import TransferProgressOverlay from './components/TransferProgressOverlay';
import { useTransmitter } from './hooks/useTransmitter';

/**
 * Props for TransmitterView.
 */
interface TransmitterViewProps {
  setBusy: (busy: boolean) => void;
  addToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
  setHeaderContent: (content: React.ReactNode) => void;
}

/**
 * Main view for the Transmitter (Sender) mode.
 * Manages configuration, file queue, and transmission status.
 */
const TransmitterView: React.FC<TransmitterViewProps> = ({
  setBusy,
  addToast,
  setHeaderContent,
}) => {
  const { state, actions } = useTransmitter({ setBusy, addToast });
  const discovery = useDiscovery();

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    setHeaderContent(
      <HeaderStatusCard
        title="Transmitter Mode"
        subtitle="Send Files to Node"
        icon={Send}
        variant="blue"
        status={state.status === 'sending' ? 'active' : 'idle'}
        statusLabel={state.status === 'sending' ? 'TRANSMITTING' : 'IDLE'}
      />,
    );
    return () => setHeaderContent(null);
  }, [state.status, setHeaderContent]);

  const handleSelectPeer = (peer: { ip: string; port?: number }) => {
    actions.setIp(peer.ip);
    if (peer.port) actions.setPort(peer.port);
    discovery.close();
  };

  return (
    <div className="h-full flex flex-col gap-4 relative overflow-hidden">
      <StatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={state.transferStats}
        history={state.sessionHistory}
      />
      <FilesQueueModal
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        files={state.files}
        onRemove={actions.removeFile}
      />

      <ScanModal
        isOpen={discovery.isOpen}
        onClose={discovery.close}
        onSelect={handleSelectPeer}
        scanning={discovery.scanning}
        peers={discovery.peers}
        error={discovery.error}
      />

      {state.status === 'idle' && (
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto pb-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[320px]">
            <NetworkConfiguration
              ip={state.ip}
              setIp={actions.setIp}
              openScan={discovery.scan}
              status={state.status}
              port={state.port}
              setPort={actions.setPort}
              protocol={state.protocol}
              setProtocol={actions.setProtocol}
              netInterface={state.netInterface}
              setNetInterface={actions.setNetInterface}
            />

            <AdvancedOptions
              delay={state.delay}
              setDelay={actions.setDelay}
              status={state.status}
              chunkSize={state.chunkSize}
              setChunkSize={actions.setChunkSize}
            />
          </div>

          <PayloadConfiguration
            files={state.files}
            addFiles={actions.addFiles}
            setFiles={actions.setFiles}
            setIsQueueOpen={setIsQueueOpen}
            status={state.status}
            startBatch={actions.startBatch}
            isValid={state.isValid}
          />
        </div>
      )}

      {(state.status === 'sending' || (state.isBatchActive && state.status === 'completed')) && (
        <TransferProgressOverlay
          progress={state.progress}
          currentFileIndex={state.currentFileIndex}
          totalFiles={state.files.length}
          currentFilename={state.files[state.currentFileIndex]?.split('/').pop() || 'Unknown'}
          onCancel={actions.cancelSend}
        />
      )}

      {state.status === 'completed' && !state.isBatchActive && (
        <TransferCompleteOverlay
          totalFiles={state.files.length}
          onShowStats={() => setShowStats(true)}
          onReset={actions.resetForm}
        />
      )}
    </div>
  );
};

export default TransmitterView;
