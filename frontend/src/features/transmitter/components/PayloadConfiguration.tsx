import { FileText, Send } from 'lucide-react';
import type React from 'react';
import ConfigGroup from '../../shared/components/ConfigGroup';
import SubmitButton from '../../shared/components/SubmitButton';
import FileSelectionConfig from './FileSelectionConfig';

/**
 * Props for the PayloadConfiguration component.
 */
interface PayloadConfigurationProps {
  /**
   * List of selected files.
   */
  files: string[];
  /**
   * Callback to add new files.
   */
  addFiles: (files: string[]) => void;
  /**
   * Callback to set the entire file list.
   */
  setFiles: (files: string[]) => void;
  /**
   * Callback to open/close the queue modal.
   */
  setIsQueueOpen: (isOpen: boolean) => void;
  /**
   * Current transmission status.
   */
  status: 'idle' | 'sending' | 'success' | 'error';
  /**
   * Callback to start the batch transmission.
   */
  startBatch: () => void;
  /**
   * Whether the configuration is valid to start sending.
   */
  isValid: boolean;
}

/**
 * A configuration form for selecting files and initiating the transfer.
 */
const PayloadConfiguration: React.FC<PayloadConfigurationProps> = ({
  files,
  addFiles,
  setFiles,
  setIsQueueOpen,
  status,
  startBatch,
  isValid,
}) => {
  return (
    <ConfigGroup
      title="Payload Configuration"
      icon={FileText}
      className="flex-1 min-h-0 flex flex-col"
    >
      <FileSelectionConfig
        files={files}
        onFilesAdded={addFiles}
        onFilesCleared={() => setFiles([])}
        onShowQueue={() => setIsQueueOpen(true)}
        disabled={status !== 'idle'}
      />

      <div className="mt-4">
        <SubmitButton
          onClick={startBatch}
          disabled={!isValid}
          variant={isValid ? 'primary' : 'secondary'}
          icon={<Send size={20} />}
        >
          SEND {files.length > 0 ? `${files.length} FILES` : 'FILES'}
        </SubmitButton>
      </div>
    </ConfigGroup>
  );
};

export default PayloadConfiguration;
