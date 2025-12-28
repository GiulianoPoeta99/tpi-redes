import type React from 'react';
import ControlContainer from '../../shared/components/ControlContainer';
import FileDropInput from '../../shared/components/FileDropInput';

/**
 * Props for the FileSelectionConfig component.
 */
interface FileSelectionConfigProps {
  /**
   * List of selected file paths.
   */
  files: string[];
  /**
   * Callback when files are added.
   */
  onFilesAdded: (files: string[]) => void;
  /**
   * Callback to clear selected files.
   */
  onFilesCleared: () => void;
  /**
   * Callback to show the file queue modal.
   */
  onShowQueue: () => void;
  disabled?: boolean;
}

/**
 * A configuration section for selecting and managing files to transfer.
 */
const FileSelectionConfig: React.FC<FileSelectionConfigProps> = (props) => {
  return (
    <ControlContainer title="Input Files" className="flex-1 flex flex-col min-h-[140px]">
      <div className="flex-1 flex flex-col justify-center">
        <FileDropInput {...props} />
      </div>
    </ControlContainer>
  );
};

export default FileSelectionConfig;
