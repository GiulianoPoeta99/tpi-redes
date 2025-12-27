import { FileText, Send } from 'lucide-react';
import type React from 'react';
import ConfigGroup from '../../shared/components/ConfigGroup';
import SubmitButton from '../../shared/components/SubmitButton';
import FileSelectionConfig from './FileSelectionConfig';

interface PayloadConfigurationProps {
  files: string[];
  addFiles: (files: string[]) => void;
  setFiles: (files: string[]) => void;
  setIsQueueOpen: (isOpen: boolean) => void;
  status: 'idle' | 'sending' | 'success' | 'error';
  startBatch: () => void;
  isValid: boolean;
}

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
      className="flex-1 min-h-[220px] flex flex-col"
    >
      {/* DROP ZONE */}
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
