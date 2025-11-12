import { FileText, Trash2 } from 'lucide-react';
import type React from 'react';
import BaseModal from './common/BaseModal';

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
          <div className="text-center py-8 text-gray-500 text-sm">No files selected.</div>
        ) : (
          files.map((file, i) => (
            <div
              key={file}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/50 hover:bg-gray-800 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-gray-500 font-mono text-xs w-5 shrink-0 text-center">
                  {i + 1}.
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-gray-200 truncate font-medium">
                    {file.split('/').pop()}
                  </p>
                  <p className="text-[10px] text-gray-600 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {file}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                aria-label="Remove file"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </BaseModal>
  );
};

export default FilesQueueModal;
