import { FileText, Trash2, X } from 'lucide-react';
import type React from 'react';

interface FilesQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: string[];
  onRemove: (index: number) => void;
}

const FilesQueueModal: React.FC<FilesQueueModalProps> = ({ isOpen, onClose, files, onRemove }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
          <h3 className="font-bold text-white flex items-center gap-2">
            <div className="bg-blue-500/20 p-1.5 rounded-lg">
              <FileText size={18} className="text-blue-400" />
            </div>
            Selected Files ({files.length})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
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

        <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilesQueueModal;
