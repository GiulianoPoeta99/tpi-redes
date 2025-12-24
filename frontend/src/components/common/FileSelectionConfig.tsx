import type React from 'react';
import ControlContainer from './ControlContainer';
import FileDropInput from './FileDropInput';

interface FileSelectionConfigProps {
  files: string[];
  onFilesAdded: (files: string[]) => void;
  onFilesCleared: () => void;
  onShowQueue: () => void;
  disabled?: boolean;
}

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
