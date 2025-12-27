import { useCallback, useEffect, useState } from 'react';
import type { FileItem, VerificationResult } from '../types';

export const useReceivedFiles = (isOpen: boolean) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verificationResults, setVerificationResults] = useState<
    Record<string, VerificationResult>
  >({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchFiles = useCallback(async () => {
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

  const openFile = async (path: string) => {
    await window.api.openPath(path);
  };

  const openFolder = async (path: string) => {
    await window.api.openFolder(path);
  };

  const verifyFile = async (file: FileItem) => {
    setVerifying(file.name);
    try {
      const result = await window.api.verifyFile(file.path);
      setVerificationResults((prev) => ({
        ...prev,
        [file.name]: { valid: result.valid, error: result.error },
      }));
    } catch {
      setVerificationResults((prev) => ({
        ...prev,
        [file.name]: { valid: false, error: 'Check failed' },
      }));
    } finally {
      setVerifying(null);
    }
  };

  return {
    files,
    loading,
    verifying,
    verificationResults,
    viewMode,
    setViewMode,
    refreshFiles: fetchFiles,
    openFile,
    openFolder,
    verifyFile,
  };
};
