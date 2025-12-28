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
        className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 transition-all group min-h-[120px] relative ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        } ${
          isDragging
            ? 'bg-blue-900/20 border-blue-500'
            : 'bg-gray-900/20 border-gray-700 hover:border-blue-500/50 hover:bg-gray-800/50'
        } ${className}`}
      >
        {files.length > 0 ? (
          <div className="text-center w-full">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-2 text-blue-400 group-hover:scale-110 transition-transform">
              <FileText size={24} />
            </div>
            <p className="font-medium text-white text-lg mb-1">
              {files.length} {files.length === 1 ? 'file' : 'files'} selected
            </p>
            <p className="text-xs text-gray-500 mb-4">Ready to transmit</p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowQueue();
                }}
                disabled={disabled}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-medium text-gray-200 flex items-center gap-2 transition-colors border border-gray-700 disabled:opacity-50"
              >
                <List size={14} /> View List
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={disabled}
                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg text-xs font-medium text-blue-300 flex items-center gap-2 transition-colors border border-blue-500/30 disabled:opacity-50"
              >
                <Plus size={14} /> Add More
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFilesCleared();
                }}
                disabled={disabled}
                className="px-3 py-1.5 bg-red-900/20 hover:bg-red-900/30 rounded-lg text-xs font-medium text-red-300 flex items-center gap-2 transition-colors border border-red-500/30 disabled:opacity-50"
              >
                <X size={14} /> Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-600 group-hover:scale-110 transition-transform group-hover:bg-gray-700 group-hover:text-blue-400">
              <Plus size={24} />
            </div>
            <p className="text-gray-300 mb-1 text-base font-medium">Drag & Drop files</p>
            <p className="text-xs text-gray-500">or click to browse</p>
          </div>
        )}
      </button>
    </>
  );
};

export default FileDropInput;
