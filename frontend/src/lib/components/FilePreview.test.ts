import { render, fireEvent, screen } from '@testing-library/svelte';
import { vi, describe, it, expect } from 'vitest';
import FilePreview from './FilePreview.svelte';

// Helper function to create mock files
function createMockFile(name: string, size: number, type: string = 'text/plain', lastModified?: number): File {
  const content = new Array(size).fill('a').join('');
  const file = new File([content], name, { type });
  
  if (lastModified !== undefined) {
    Object.defineProperty(file, 'lastModified', {
      value: lastModified,
      writable: false
    });
  }
  
  return file;
}

describe('FilePreview', () => {
  it('renders file information correctly', () => {
    const mockFile = createMockFile('test.txt', 1024, 'text/plain');
    
    render(FilePreview, { file: mockFile, index: 0 });
    
    expect(screen.getByTestId('file-preview-0')).toBeInTheDocument();
    expect(screen.getByText('test.txt')).toBeInTheDocument();
    expect(screen.getByTestId('file-size')).toHaveTextContent('1.0 KB');
    expect(screen.getByTestId('file-type')).toHaveTextContent('TXT File');
    expect(screen.getByTestId('mime-type')).toHaveTextContent('text/plain');
  });

  it('displays correct file icons for different file types', () => {
    const testCases = [
      { name: 'image.jpg', type: 'image/jpeg', expectedIcon: '🖼️' },
      { name: 'document.pdf', type: 'application/pdf', expectedIcon: '📄' },
      { name: 'video.mp4', type: 'video/mp4', expectedIcon: '🎥' },
      { name: 'audio.mp3', type: 'audio/mpeg', expectedIcon: '🎵' },
      { name: 'archive.zip', type: 'application/zip', expectedIcon: '🗜️' },
      { name: 'script.js', type: 'text/javascript', expectedIcon: '💻' },
      { name: 'unknown.xyz', type: '', expectedIcon: '📁' }
    ];

    testCases.forEach(({ name, type, expectedIcon }, index) => {
      const mockFile = createMockFile(name, 1024, type);
      const { container } = render(FilePreview, { file: mockFile, index });
      
      const iconElement = container.querySelector('.file-icon');
      expect(iconElement).toHaveTextContent(expectedIcon);
    });
  });

  it('formats file sizes correctly', () => {
    const testCases = [
      { size: 512, expected: '512 B' },
      { size: 1024, expected: '1.0 KB' },
      { size: 1024 * 1024, expected: '1.0 MB' },
      { size: 1024 * 1024 * 1024, expected: '1.0 GB' }
    ];

    testCases.forEach(({ size, expected }) => {
      const mockFile = createMockFile('test.txt', size);
      const { container } = render(FilePreview, { file: mockFile, index: 0 });
      
      expect(screen.getByTestId('file-size')).toHaveTextContent(expected);
      container.remove();
    });
  });

  it('formats last modified dates correctly', () => {
    const now = new Date();
    const today = now.getTime();
    const yesterday = today - (24 * 60 * 60 * 1000);
    const threeDaysAgo = today - (3 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = today - (7 * 24 * 60 * 60 * 1000);

    const testCases = [
      { timestamp: today, expected: 'Today' },
      { timestamp: yesterday, expected: 'Yesterday' },
      { timestamp: threeDaysAgo, expected: '3 days ago' },
      { timestamp: oneWeekAgo, expected: new Date(oneWeekAgo).toLocaleDateString() }
    ];

    testCases.forEach(({ timestamp, expected }) => {
      const mockFile = createMockFile('test.txt', 1024, 'text/plain', timestamp);
      const { container } = render(FilePreview, { file: mockFile, index: 0 });
      
      expect(screen.getByTestId('file-modified')).toHaveTextContent(expected);
      container.remove();
    });
  });

  it('shows remove button by default', () => {
    const mockFile = createMockFile('test.txt', 1024);
    
    render(FilePreview, { file: mockFile, index: 0 });
    
    expect(screen.getByTestId('remove-button-0')).toBeInTheDocument();
  });

  it('hides remove button when showRemoveButton is false', () => {
    const mockFile = createMockFile('test.txt', 1024);
    
    render(FilePreview, { file: mockFile, index: 0, showRemoveButton: false });
    
    expect(screen.queryByTestId('remove-button-0')).not.toBeInTheDocument();
  });

  it('emits remove event when remove button is clicked', async () => {
    const mockFile = createMockFile('test.txt', 1024);
    const component = render(FilePreview, { file: mockFile, index: 5 });
    
    let removedIndex: number | null = null;
    component.component.$on('remove', (event) => {
      removedIndex = event.detail;
    });

    const removeButton = screen.getByTestId('remove-button-5');
    await fireEvent.click(removeButton);

    expect(removedIndex).toBe(5);
  });

  it('disables remove button when disabled prop is true', () => {
    const mockFile = createMockFile('test.txt', 1024);
    
    render(FilePreview, { file: mockFile, index: 0, disabled: true });
    
    const removeButton = screen.getByTestId('remove-button-0');
    expect(removeButton).toBeDisabled();
    expect(removeButton).toHaveClass('disabled');
  });

  it('does not emit remove event when disabled', async () => {
    const mockFile = createMockFile('test.txt', 1024);
    const component = render(FilePreview, { file: mockFile, index: 0, disabled: true });
    
    let removedIndex: number | null = null;
    component.component.$on('remove', (event) => {
      removedIndex = event.detail;
    });

    const removeButton = screen.getByTestId('remove-button-0');
    await fireEvent.click(removeButton);

    expect(removedIndex).toBeNull();
  });

  it('handles files without extensions correctly', () => {
    const mockFile = createMockFile('README', 1024, 'text/plain');
    
    render(FilePreview, { file: mockFile, index: 0 });
    
    expect(screen.getByTestId('file-type')).toHaveTextContent('text/plain');
  });

  it('handles files without MIME type correctly', () => {
    const mockFile = createMockFile('test.unknown', 1024, '');
    
    render(FilePreview, { file: mockFile, index: 0 });
    
    expect(screen.getByTestId('file-type')).toHaveTextContent('UNKNOWN File');
    expect(screen.queryByTestId('mime-type')).not.toBeInTheDocument();
  });

  it('truncates long file names with title attribute', () => {
    const longFileName = 'this-is-a-very-long-file-name-that-should-be-truncated.txt';
    const mockFile = createMockFile(longFileName, 1024);
    
    render(FilePreview, { file: mockFile, index: 0 });
    
    const nameElement = screen.getByText(longFileName);
    expect(nameElement).toHaveAttribute('title', longFileName);
    expect(nameElement).toHaveClass('truncate');
  });

  it('recognizes various document file types', () => {
    const documentTypes = [
      { name: 'document.doc', type: 'application/msword', expectedType: 'DOC File' },
      { name: 'spreadsheet.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', expectedType: 'XLSX File' },
      { name: 'presentation.ppt', type: 'application/vnd.ms-powerpoint', expectedType: 'PPT File' }
    ];

    documentTypes.forEach(({ name, type, expectedType }) => {
      const mockFile = createMockFile(name, 1024, type);
      const { container } = render(FilePreview, { file: mockFile, index: 0 });
      
      expect(screen.getByTestId('file-type')).toHaveTextContent(expectedType);
      container.remove();
    });
  });

  it('recognizes code file extensions', () => {
    const codeFiles = [
      'script.js',
      'component.ts',
      'program.py',
      'Main.java',
      'app.cpp',
      'service.cs',
      'module.rs'
    ];

    codeFiles.forEach((fileName) => {
      const mockFile = createMockFile(fileName, 1024);
      const { container } = render(FilePreview, { file: mockFile, index: 0 });
      
      const iconElement = container.querySelector('.file-icon');
      expect(iconElement).toHaveTextContent('💻');
      container.remove();
    });
  });
});