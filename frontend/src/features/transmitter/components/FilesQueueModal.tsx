import { FileText } from 'lucide-react';
import type React from 'react';
import BaseModal from '../../shared/components/BaseModal';
import EmptyState from '../../shared/components/EmptyState';
import FileListItem from '../../shared/components/FileListItem';

interface FilesQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: string[];
  onRemove: (index: number) => void;
}

const FilesQueueModal: React.FC<FilesQueueModalProps> = ({ isOpen, onClose, files, onRemove }) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Selected Files (${files.length})`}
      icon={FileText}
      size="md"
    >
      <div className="flex-1 space-y-2">
        {files.length === 0 ? (
          <EmptyState icon={FileText} title="No files selected" className="py-8" />
        ) : (
          files.map((file, i) => (
            <FileListItem
              key={file}
              filename={file.split('/').pop() || file}
              onRemove={() => onRemove(i)}
            />
          ))
        )}
      </div>
    </BaseModal>
  );
};

export default FilesQueueModal;
