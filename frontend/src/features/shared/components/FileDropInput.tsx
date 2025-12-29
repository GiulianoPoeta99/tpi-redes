import { FileText, List, Plus, X } from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';

/**
 * Props for FileDropInput.
 *
 * @property files - Array of currently selected file paths.
 * @property onFilesAdded - Callback when new files are selected or dropped.
 * @property onFilesCleared - Callback to clear the file selection.
 * @property onShowQueue - Callback to open the file queue modal.
 * @property disabled - Whether the input interactions are disabled.
 * @property className - Optional additional CSS classes.
 */
interface FileDropInputProps {
  files: string[];
  onFilesAdded: (files: string[]) => void;
  onFilesCleared: () => void;
  onShowQueue: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * A drag-and-drop file input area.
 * Supports multiple file selection and displays summary of selected files.
 */
const FileDropInput: React.FC<FileDropInputProps> = ({
  files,
  onFilesAdded,
  onFilesCleared,
  onShowQueue,
  disabled = false,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const paths = Array.from(e.target.files)
        .map((f) => window.api.getFilePath(f))
        .filter(Boolean) as string[];
      if (paths.length > 0) {
        onFilesAdded(paths);
      }
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const paths = Array.from(e.dataTransfer.files)
      .map((f) => window.api.getFilePath(f))
      .filter(Boolean) as string[];
    if (paths.length > 0) {
      onFilesAdded(paths);
    }
  };

  return (
    <>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      <button
        type="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            if (files.length === 0) fileInputRef.current?.click();
          }
        }}
        onClick={() => !disabled && files.length === 0 && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) {
            e.dataTransfer.dropEffect = 'copy';
            setIsDragging(true);
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`flex-1 border-2 border-dashed rounded-xl flex items-center justify-center transition-all group min-h-[100px] relative ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        } ${
          isDragging
            ? 'bg-blue-900/20 border-blue-500'
            : 'bg-gray-900/20 border-gray-700 hover:border-blue-500/50 hover:bg-gray-800/50'
        } ${className} ${files.length > 0 ? 'px-4 py-2' : 'px-4 py-2 flex-col'}`}
      >
        {files.length > 0 ? (
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400 shrink-0">
                <FileText size={20} />
              </div>
              <div className="text-left min-w-0">
                <p className="font-medium text-white text-sm truncate">
                  {files.length} {files.length === 1 ? 'file' : 'files'} selected
                </p>
                <p className="text-[10px] text-gray-500">Ready to transmit</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowQueue();
                }}
                disabled={disabled}
                className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-200 transition-colors border border-gray-700"
                title="View List"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={disabled}
                className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg text-blue-300 transition-colors border border-blue-500/30"
                title="Add More"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFilesCleared();
                }}
                disabled={disabled}
                className="p-1.5 bg-red-900/20 hover:bg-red-900/30 rounded-lg text-red-300 transition-colors border border-red-500/30"
                title="Clear All"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-1 text-gray-600 group-hover:scale-110 transition-transform group-hover:bg-gray-700 group-hover:text-blue-400">
              <Plus size={20} />
            </div>
            <p className="text-gray-300 mb-0.5 text-sm font-medium">Drag & Drop files</p>
            <p className="text-[10px] text-gray-500">or click to browse</p>
          </div>
        )}
      </button>
    </>
  );
};

export default FileDropInput;
