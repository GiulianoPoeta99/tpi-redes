import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import FileDropZone from './FileDropZone.svelte';

// Mock Tauri APIs
const mockOpen = vi.fn();
const mockReadBinaryFile = vi.fn();

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: mockOpen
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readBinaryFile: mockReadBinaryFile
}));

// Helper functions
function createMockFile(name: string, size: number, type: string = 'text/plain'): File {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
}

function createMockDragEvent(files: File[]): DragEvent {
  const dataTransfer = {
    files: {
      length: files.length,
      item: (index: number) => files[index],
      [Symbol.iterator]: function* () {
        for (let i = 0; i < files.length; i++) {
          yield files[i];
        }
      }
    } as FileList
  };

  return new DragEvent('drop', { dataTransfer }) as DragEvent;
}

describe('File Selection Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('completes full file selection workflow via drag and drop', async () => {
    const component = render(FileDropZone, {
      multiple: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['.txt', '.pdf', '.jpg']
    });

    const mockFiles = [
      createMockFile('document.txt', 1024, 'text/plain'),
      createMockFile('image.jpg', 2048, 'image/jpeg'),
      createMockFile('manual.pdf', 4096, 'application/pdf')
    ];

    let selectedFiles: File[] = [];
    let validationErrors: Array<{ file: File; error: string }> = [];

    component.component.$on('filesSelected', (event) => {
      selectedFiles = event.detail;
    });

    component.component.$on('fileValidationError', (event) => {
      validationErrors.push(event.detail);
    });

    // Step 1: Drag files over the drop zone
    const dropzone = screen.getByTestId('dropzone');
    
    await fireEvent.dragEnter(dropzone, {
      dataTransfer: { files: [] }
    });

    expect(dropzone).toHaveClass('drag-over');
    expect(screen.getByText('Drop files here')).toBeInTheDocument();

    // Step 2: Drop the files
    const dragEvent = createMockDragEvent(mockFiles);
    await fireEvent.drop(dropzone, dragEvent);

    // Step 3: Verify files were processed correctly
    expect(selectedFiles).toHaveLength(3);
    expect(validationErrors).toHaveLength(0);
    expect(dropzone).not.toHaveClass('drag-over');

    // Step 4: Verify file preview is displayed
    await waitFor(() => {
      expect(screen.getByTestId('file-preview')).toBeInTheDocument();
      expect(screen.getByText('document.txt')).toBeInTheDocument();
      expect(screen.getByText('image.jpg')).toBeInTheDocument();
      expect(screen.getByText('manual.pdf')).toBeInTheDocument();
    });

    // Step 5: Remove one file
    const removeButton = screen.getByTestId('remove-button-1'); // Remove image.jpg
    await fireEvent.click(removeButton);

    expect(selectedFiles).toHaveLength(2);
    expect(selectedFiles.map(f => f.name)).toEqual(['document.txt', 'manual.pdf']);

    // Step 6: Clear all files
    const clearButton = screen.getByTestId('clear-files');
    await fireEvent.click(clearButton);

    expect(selectedFiles).toHaveLength(0);
  });

  it('completes full file selection workflow via file browser', async () => {
    // Mock file browser responses
    mockOpen.mockResolvedValue(['/path/to/file1.txt', '/path/to/file2.pdf']);
    mockReadBinaryFile
      .mockResolvedValueOnce(new Uint8Array([1, 2, 3, 4])) // file1.txt
      .mockResolvedValueOnce(new Uint8Array([5, 6, 7, 8])); // file2.pdf

    const component = render(FileDropZone, {
      multiple: true,
      allowedTypes: ['.txt', '.pdf']
    });

    let selectedFiles: File[] = [];
    component.component.$on('filesSelected', (event) => {
      selectedFiles = event.detail;
    });

    // Step 1: Click to open file browser
    const dropzone = screen.getByTestId('dropzone');
    await fireEvent.click(dropzone);

    // Step 2: Verify file browser was called with correct parameters
    expect(mockOpen).toHaveBeenCalledWith({
      multiple: true,
      filters: [{
        name: 'Allowed Files',
        extensions: ['txt', 'pdf']
      }]
    });

    // Step 3: Wait for files to be processed
    await waitFor(() => {
      expect(selectedFiles).toHaveLength(2);
    });

    // Step 4: Verify file reading was called
    expect(mockReadBinaryFile).toHaveBeenCalledWith('/path/to/file1.txt');
    expect(mockReadBinaryFile).toHaveBeenCalledWith('/path/to/file2.pdf');

    // Step 5: Verify files have correct names
    expect(selectedFiles[0].name).toBe('file1.txt');
    expect(selectedFiles[1].name).toBe('file2.pdf');
  });

  it('handles mixed valid and invalid files correctly', async () => {
    const component = render(FileDropZone, {
      multiple: true,
      maxFileSize: 1024, // 1KB limit
      allowedTypes: ['.txt']
    });

    const mockFiles = [
      createMockFile('valid.txt', 512, 'text/plain'),        // Valid
      createMockFile('too-large.txt', 2048, 'text/plain'),   // Too large
      createMockFile('wrong-type.jpg', 512, 'image/jpeg'),   // Wrong type
      createMockFile('valid2.txt', 256, 'text/plain')        // Valid
    ];

    let selectedFiles: File[] = [];
    let validationErrors: Array<{ file: File; error: string }> = [];

    component.component.$on('filesSelected', (event) => {
      selectedFiles = event.detail;
    });

    component.component.$on('fileValidationError', (event) => {
      validationErrors.push(event.detail);
    });

    // Drop all files
    const dropzone = screen.getByTestId('dropzone');
    const dragEvent = createMockDragEvent(mockFiles);
    await fireEvent.drop(dropzone, dragEvent);

    // Verify only valid files were selected
    expect(selectedFiles).toHaveLength(2);
    expect(selectedFiles.map(f => f.name)).toEqual(['valid.txt', 'valid2.txt']);

    // Verify validation errors were reported
    expect(validationErrors).toHaveLength(2);
    expect(validationErrors[0].file.name).toBe('too-large.txt');
    expect(validationErrors[0].error).toContain('exceeds maximum allowed size');
    expect(validationErrors[1].file.name).toBe('wrong-type.jpg');
    expect(validationErrors[1].error).toContain('File type not allowed');
  });

  it('handles single file mode correctly', async () => {
    const component = render(FileDropZone, {
      multiple: false,
      maxFileSize: 10 * 1024 * 1024
    });

    const mockFiles = [
      createMockFile('first.txt', 1024),
      createMockFile('second.txt', 2048),
      createMockFile('third.txt', 4096)
    ];

    let selectedFiles: File[] = [];
    component.component.$on('filesSelected', (event) => {
      selectedFiles = event.detail;
    });

    // Drop multiple files
    const dropzone = screen.getByTestId('dropzone');
    const dragEvent = createMockDragEvent(mockFiles);
    await fireEvent.drop(dropzone, dragEvent);

    // Verify only the first file was selected
    expect(selectedFiles).toHaveLength(1);
    expect(selectedFiles[0].name).toBe('first.txt');

    // Verify no clear button is shown for single file mode
    expect(screen.queryByTestId('clear-files')).not.toBeInTheDocument();
  });

  it('maintains accessibility throughout the workflow', async () => {
    render(FileDropZone);

    const dropzone = screen.getByTestId('dropzone');

    // Verify dropzone is accessible
    expect(dropzone).toHaveAttribute('role', 'button');
    expect(dropzone).toHaveAttribute('tabindex', '0');

    // Test keyboard navigation
    dropzone.focus();
    expect(document.activeElement).toBe(dropzone);

    // Test keyboard activation
    mockOpen.mockResolvedValue('/path/to/file.txt');
    mockReadBinaryFile.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

    await fireEvent.keyDown(dropzone, { key: 'Enter' });
    expect(mockOpen).toHaveBeenCalled();
  });

  it('handles error scenarios gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Test file browser error
    mockOpen.mockRejectedValue(new Error('File dialog failed'));
    
    const component = render(FileDropZone);
    const dropzone = screen.getByTestId('dropzone');

    await fireEvent.click(dropzone);

    expect(consoleSpy).toHaveBeenCalledWith('Failed to open file dialog:', expect.any(Error));

    // Test file reading error
    mockOpen.mockResolvedValue('/path/to/file.txt');
    mockReadBinaryFile.mockRejectedValue(new Error('File read failed'));

    await fireEvent.click(dropzone);

    expect(consoleSpy).toHaveBeenCalledWith('Failed to read file /path/to/file.txt:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('respects disabled state throughout workflow', async () => {
    const component = render(FileDropZone, { 
      disabled: true,
      multiple: true 
    });

    const mockFile = createMockFile('test.txt', 1024);
    let selectedFiles: File[] = [];

    component.component.$on('filesSelected', (event) => {
      selectedFiles = event.detail;
    });

    const dropzone = screen.getByTestId('dropzone');

    // Verify disabled styling
    expect(dropzone).toHaveClass('disabled');

    // Test that drag and drop is ignored
    const dragEvent = createMockDragEvent([mockFile]);
    await fireEvent.drop(dropzone, dragEvent);
    expect(selectedFiles).toHaveLength(0);

    // Test that click is ignored
    await fireEvent.click(dropzone);
    expect(mockOpen).not.toHaveBeenCalled();

    // Test that keyboard activation is ignored
    await fireEvent.keyDown(dropzone, { key: 'Enter' });
    expect(mockOpen).not.toHaveBeenCalled();

    // Add a file manually and test that remove buttons are disabled
    component.component.$set({ selectedFiles: [mockFile] });

    await waitFor(() => {
      const removeButton = screen.getByTestId('remove-button-0');
      expect(removeButton).toBeDisabled();
      expect(removeButton).toHaveClass('disabled');
    });
  });

  it('updates display text correctly based on selection state', async () => {
    const component = render(FileDropZone, { multiple: true });

    const dropzone = screen.getByTestId('dropzone');

    // Initial state
    expect(screen.getByText('Drag & drop files here or click to browse')).toBeInTheDocument();

    // After selecting files
    const mockFiles = [
      createMockFile('file1.txt', 1024),
      createMockFile('file2.txt', 2048)
    ];

    component.component.$set({ selectedFiles: mockFiles });

    await waitFor(() => {
      expect(screen.getByText('2 files selected')).toBeInTheDocument();
    });

    // Single file mode
    component.component.$set({ multiple: false, selectedFiles: [mockFiles[0]] });

    await waitFor(() => {
      expect(screen.getByText('file1.txt')).toBeInTheDocument();
    });
  });
});