import { Check, FileText, Folder, RefreshCw, ShieldCheck, X } from 'lucide-react';
import type React from 'react';
import { formatBytes, formatDate } from '../../shared/utils/formatters';
import type { FileItem, VerificationResult } from '../types';

interface ReceivedFileListProps {
  files: FileItem[];
  verificationResults: Record<string, VerificationResult>;
  verifying: string | null;
  onVerify: (file: FileItem) => void;
  onOpen: (path: string) => void;
  onOpenFolder: (path: string) => void;
}

const ReceivedFileList: React.FC<ReceivedFileListProps> = ({
  files,
  verificationResults,
  verifying,
  onVerify,
  onOpen,
  onOpenFolder,
}) => {
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="text-xs font-bold text-gray-500 uppercase border-b border-gray-800">
          <th className="pb-3 pl-2">Name</th>
          <th className="pb-3">Size</th>
          <th className="pb-3">Date</th>
          <th className="pb-3 text-right pr-2">Actions</th>
        </tr>
      </thead>
      <tbody className="text-sm">
        {files.map((file) => {
          const verifyResult = verificationResults[file.name];
          return (
            <tr
              key={file.name}
              className="group border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <td className="py-3 pl-2 max-w-xs break-all">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-blue-400 shrink-0" />
                  <span className="text-white font-medium">{file.name}</span>
                </div>
              </td>
              <td className="py-3 text-gray-400 font-mono">{formatBytes(file.size)}</td>
              <td className="py-3 text-gray-500">{formatDate(file.mtime)}</td>
              <td className="py-3 pr-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="mr-2">
                    {verifyResult ? (
                      <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold ${
                          verifyResult.valid
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                        title={verifyResult.error}
                      >
                        {verifyResult.valid ? <Check size={12} /> : <X size={12} />}
                        {verifyResult.valid ? 'VERIFIED' : 'CORRUPT'}
                      </div>
                    ) : (
                      <button
                        onClick={() => onVerify(file)}
                        disabled={verifying === file.name}
                        className="flex items-center gap-1.5 px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors border border-gray-700 cursor-pointer"
                        type="button"
                      >
                        {verifying === file.name ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <ShieldCheck size={12} />
                        )}
                        Check Integrity
                      </button>
                    )}
                  </div>

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
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 cursor-pointer"
                    type="button"
                  >
                    OPEN
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default ReceivedFileList;
