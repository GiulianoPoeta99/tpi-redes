import { Folder, LayoutGrid, List, RefreshCw } from 'lucide-react';
import React from 'react';
import BaseModal from '../../shared/components/BaseModal';
import { useReceivedFiles } from '../hooks/useReceivedFiles';
import ReceivedFileGrid from './ReceivedFileGrid';
import ReceivedFileList from './ReceivedFileList';

/**
 * Props for the ReceivedFilesModal component.
 *
 * @property isOpen - Whether the modal is open.
 * @property onClose - Callback to close the modal.
 */
interface ReceivedFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * A modal that displays all received files, allowing interaction and verification.
 */
export const ReceivedFilesModal: React.FC<ReceivedFilesModalProps> = ({ isOpen, onClose }) => {
  const {
    files,
    loading,
    verifying,
    verificationResults,
    viewMode,
    setViewMode,
    refreshFiles,
    openFile,
    openFolder,
    verifyFile,
  } = useReceivedFiles(isOpen);

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
              className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'} cursor-pointer`}
              type="button"
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'} cursor-pointer`}
              type="button"
              title="List View"
            >
              <List size={16} />
            </button>
          </div>
          <button
            onClick={refreshFiles}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer"
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
        <ReceivedFileList
          files={files}
          verificationResults={verificationResults}
          verifying={verifying}
          onVerify={verifyFile}
          onOpen={openFile}
          onOpenFolder={openFolder}
        />
      ) : (
        <ReceivedFileGrid
          files={files}
          verificationResults={verificationResults}
          verifying={verifying}
          onVerify={verifyFile}
          onOpen={openFile}
          onOpenFolder={openFolder}
        />
      )}
    </BaseModal>
  );
};
