import { Check, FileText, Folder, LayoutGrid, List, RefreshCw, ShieldCheck, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import BaseModal from './common/BaseModal';

interface FileItem {
  name: string;
  size: number;
  mtime: number;
  path: string;
}

interface VerificationResult {
  valid: boolean;
  error?: string;
}

interface ReceivedFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceivedFilesModal: React.FC<ReceivedFilesModalProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verificationResults, setVerificationResults] = useState<
    Record<string, VerificationResult>
  >({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchFiles = React.useCallback(async () => {
    setLoading(true);
    try {
      const dir = await window.api.getDownloadsDir();
      const list = await window.api.listFiles(dir);
      // Sort by newest first
      setFiles(list.sort((a, b) => b.mtime - a.mtime));
    } catch (error) {
      console.error('Failed to list files:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, fetchFiles]);

  const handleOpen = async (path: string) => {
    await window.api.openPath(path);
  };

  const handleOpenFolder = async (path: string) => {
    await window.api.openFolder(path);
  };

  const handleVerify = async (file: FileItem) => {
    setVerifying(file.name);
    try {
      const result = await window.api.verifyFile(file.path);
      setVerificationResults((prev) => ({
        ...prev,
        [file.name]: { valid: result.valid, error: result.error },
      }));
    } catch (e: any) {
      setVerificationResults((prev) => ({
        ...prev,
        [file.name]: { valid: false, error: 'Check failed' },
      }));
    } finally {
      setVerifying(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleString();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Received Files"
      description="Browse and verify downloaded content"
      icon={Folder}
      size="2xl"
      headerContent={
        <React.Fragment>
          <div className="flex bg-gray-800 rounded-lg p-1 mr-2 border border-gray-700/50">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              type="button"
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              type="button"
              title="List View"
            >
              <List size={16} />
            </button>
          </div>
          <button
            onClick={fetchFiles}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Refresh"
            type="button"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </React.Fragment>
      }
    >
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <Folder size={48} className="opacity-20 mb-4" />
          <p>No files found in received folder.</p>
        </div>
      ) : viewMode === 'list' ? (
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
                  className="group border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="py-3 pl-2 max-w-xs break-all">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-blue-400 shrink-0" />
                      <span className="text-white font-medium">{file.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-400 font-mono">
                    {formatSize(file.size)}
                  </td>
                  <td className="py-3 text-gray-500">{formatDate(file.mtime)}</td>
                  <td className="py-3 pr-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Verify Integrity */}
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
                            onClick={() => handleVerify(file)}
                            disabled={verifying === file.name}
                            className="flex items-center gap-1.5 px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors border border-gray-700"
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
                        onClick={() => handleOpenFolder(file.path)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title="Show in Folder"
                        type="button"
                      >
                        <Folder size={16} />
                      </button>
                      <button
                        onClick={() => handleOpen(file.path)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5"
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
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => {
            const verifyResult = verificationResults[file.name];
            return (
              <div
                key={file.name}
                className="group bg-gray-800/50 border border-gray-700/50 hover:border-blue-500/50 hover:bg-gray-800 rounded-xl p-4 flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl relative"
              >
                <div className="flex-1 flex flex-col items-center text-center justify-center py-4">
                  <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileText size={32} className="text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-200 line-clamp-2 break-all mb-1">
                    {file.name}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    {formatSize(file.size)}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-700/50 flex items-center justify-between gap-2">
                  {verifyResult ? (
                    <button
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-bold ${verifyResult.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                      title={verifyResult.error}
                      onClick={() => handleVerify(file)}
                      type="button"
                    >
                      {verifyResult.valid ? <Check size={14} /> : <X size={14} />}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleVerify(file)}
                      className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
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
                    onClick={() => handleOpenFolder(file.path)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    title="Show in Folder"
                    type="button"
                  >
                    <Folder size={16} />
                  </button>
                  <button
                    onClick={() => handleOpen(file.path)}
                    className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors font-bold text-[10px]"
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
      )}
    </BaseModal>
  );
};
