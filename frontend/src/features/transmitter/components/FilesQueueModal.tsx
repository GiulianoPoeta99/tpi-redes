import { FileText } from 'lucide-react';
import type React from 'react';
import BaseModal from '../../shared/components/BaseModal';
import EmptyState from '../../shared/components/EmptyState';
import FileListItem from '../../shared/components/FileListItem';

/**
 * Props for the FilesQueueModal component.
 */
interface FilesQueueModalProps {
  /**
   * Whether the modal is open.
   */
  isOpen: boolean;
  /**
   * Callback to close the modal.
   */
  onClose: () => void;
  /**
   * List of files in the queue.
   */
  files: string[];
  /**
   * Callback to remove a file by index.
   */
  onRemove: (index: number) => void;
}

/**
 * A modal that displays the list of files selected for transmission.
 */
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
