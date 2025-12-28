import { Check, FileText, Folder, RefreshCw, ShieldCheck, X } from 'lucide-react';
import type React from 'react';
import { formatBytes } from '../../shared/utils/formatters';
import type { FileItem, VerificationResult } from '../types';

/**
 * Props for the ReceivedFileGrid component.
 *
 * @property files - List of files to display.
 * @property verificationResults - Status results for file verification.
 * @property verifying - Name of the file currently being verified, if any.
 * @property onVerify - Callback to verify a file's integrity.
 * @property onOpen - Callback to open a file.
 * @property onOpenFolder - Callback to show a file in its folder.
 */
interface ReceivedFileGridProps {
  files: FileItem[];
  verificationResults: Record<string, VerificationResult>;
  verifying: string | null;
  onVerify: (file: FileItem) => void;
  onOpen: (path: string) => void;
  onOpenFolder: (path: string) => void;
}

/**
 * A grid layout for displaying received files with options to verify and open them.
 */
const ReceivedFileGrid: React.FC<ReceivedFileGridProps> = ({
  files,
  verificationResults,
  verifying,
  onVerify,
  onOpen,
  onOpenFolder,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {files.map((file) => {
        const verifyResult = verificationResults[file.name];
        return (
          <div
            key={file.name}
            className="group bg-white/5 backdrop-blur-sm border border-white/10 hover:border-blue-500/50 hover:bg-white/10 rounded-xl p-4 flex flex-col transition-all hover:-translate-y-1 hover:shadow-lg relative"
          >
            <div className="flex-1 flex flex-col items-center text-center justify-center py-4">
              <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText size={32} className="text-blue-400" />
              </div>
              <h3 className="text-sm font-bold text-gray-200 line-clamp-2 break-all mb-1">
                {file.name}
              </h3>
              <p className="text-xs text-gray-500 font-mono">{formatBytes(file.size)}</p>
            </div>

            <div className="pt-3 border-t border-gray-700/50 flex items-center justify-between gap-2">
              {verifyResult ? (
                <button
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-bold ${
                    verifyResult.valid
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                  title={verifyResult.error}
                  onClick={() => onVerify(file)}
                  type="button"
                >
                  {verifyResult.valid ? <Check size={14} /> : <X size={14} />}
                </button>
              ) : (
                <button
                  onClick={() => onVerify(file)}
                  className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  disabled={verifying === file.name}
                  title="Check Integrity"
                  type="button"
                >
                  {verifying === file.name ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                  <span>Verify</span>
                </button>
              )}

              <button
                onClick={() => onOpenFolder(file.path)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors cursor-pointer"
                title="Show in Folder"
                type="button"
              >
                <Folder size={16} />
              </button>
              <button
                onClick={() => onOpen(file.path)}
                className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors font-bold text-[10px] cursor-pointer"
                title="Open File"
                type="button"
              >
                OPEN
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReceivedFileGrid;
