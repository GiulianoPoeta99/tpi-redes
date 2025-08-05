import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import FileDropZone from './FileDropZone.svelte';

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn()
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readBinaryFile: vi.fn()
}));

// Helper function to create mock files
function createMockFile(name: string, size: number, type: string = 'text/plain'): File {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
}

// Helper function to create mock drag event
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

describe('FileDropZone', () => {
  let mockOpen: any;
  let mockReadBinaryFile: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked functions
    const dialogModule = await import('@tauri-apps/plugin-dialog');
    const fsModule = await import('@tauri-apps/plugin-fs');
    
    mockOpen = dialogModule.open as any;
    mockReadBinaryFile = fsModule.readBinaryFile as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with default content', () => {
    render(FileDropZone);
    
    expect(screen.getByTestId('file-drop-zone')).toBeInTheDocument();
    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
    expect(screen.getByText('Drag & drop files here or click to browse')).toBeInTheDocument();
  });

  it('handles single file selection via drag and drop', async () => {
    const component = render(FileDropZone);
    const mockFile = createMockFile('test.txt', 1000);
    let selectedFiles: File[] = [];

    component.component.$on('filesSelected', (event) => {
      selectedFiles = event.detail;
    });

    const dropzone = screen.getByTestId('dropzone');
    const dragEvent = createMockDragEvent([mockFile]);

    await fireEvent.drop(dropzone, dragEvent);

    expect(selectedFiles).toHaveLength(1);
    expect(selectedFiles[0].name).toBe('test.txt');
    expect(selectedFiles[0].size).toBe(1000);
  });

  it('handles multiple file selection when multiple=true', async () => {
    const component = render(FileDropZone, { multiple: true });
    const mockFiles = [
      createMockFile('file1.txt', 1000),
      createMockFile('file2.txt', 2000)
    ];
    let selectedFiles: File[] = [];

    component.component.$on('filesSelected', (event) => {
      selectedFiles = event.detail;
    });

    const dropzone = screen.getByTestId('dropzone');
    const dragEvent = createMockDragEvent(mockFiles);

    await fireEvent.drop(dropzone, dragEvent);

    expect(selectedFiles).toHaveLength(2);
    expect(selectedFiles[0].name).toBe('file1.txt');
    expect(selectedFiles[1].name).toBe('file2.txt');
  });

  it('validates file size limits', async () => {
    const component = render(FileDropZone, { maxFileSize: 500 });
    const mockFile = createMockFile('large.txt', 1000); // Exceeds limit
    let validationError: { file: File; error: string } | null = null;

    component.component.$on('fileValidationError', (event) => {
      validationError = event.detail;
    });

    const dropzone = screen.getByTestId('dropzone');
    const dragEvent = createMockDragEvent([mockFile]);

    await fireEvent.drop(dropzone, dragEvent);

    expect(validationError).not.toBeNull();
    expect(validationError!.file.name).toBe('large.txt');
    expect(validationError!.error).toContain('exceeds maximum allowed size');
  });

  it('validates file types when restrictions are set', async () => {
    const component = render(FileDropZone, { allowedTypes: ['.txt', '.md'] });
    const mockFile = createMockFile('image.jpg', 1000, 'image/jpeg');
    let validationError: { file: File; error: string } | null = null;

    component.component.$on('fileValidationError', (event) => {
      validationError = event.detail;
    });

    const dropzone = screen.getByTestId('dropzone');
    const dragEvent = createMockDragEvent([mockFile]);

    await fireEvent.drop(dropzone, dragEvent);

    expect(validationError).not.toBeNull();
    expect(validationError!.file.name).toBe('image.jpg');
    expect(validationError!.error).toContain('File type not allowed');
  });

  it('shows drag over state during drag operations', async () => {
    render(FileDropZone);
    const dropzone = screen.getByTestId('dropzone');

    // Simulate drag enter
    await fireEvent.dragEnter(dropzone, {
      dataTransfer: { files: [] }
    });

    expect(dropzone).toHaveClass('drag-over');
    expect(screen.getByText('Drop files here')).toBeInTheDocument();

    // Simulate drag leave
    await fireEvent.dragLeave(dropzone, {
      dataTransfer: { files: [] }
    });

    expect(dropzone).not.toHaveClass('drag-over');
  });

  it('opens file browser when clicked', async () => {
    mockOpen.mockResolvedValue('/path/to/file.txt');
    mockReadBinaryFile.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

    render(FileDropZone);
    const dropzone = screen.getByTestId('dropzone');

    await fireEvent.click(dropzone);

    expect(mockOpen).toHaveBeenCalledWith({
      multiple: false,
      filters: undefined
    });
  });

  it('opens file browser with filters when allowedTypes is set', async () => {
    mockOpen.mockResolvedValue('/path/to/file.txt');
    mockReadBinaryFile.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

    render(FileDropZone, { allowedTypes: ['.txt', '.md'] });
    const dropzone = screen.getByTestId('dropzone');

    await fireEvent.click(dropzone);

    expect(mockOpen).toHaveBeenCalledWith({
      multiple: false,
      filters: [{
        name: 'Allowed Files',
        extensions: ['txt', 'md']
      }]
    });
  });

  it('displays selected files in preview', async () => {
    const component = render(FileDropZone);
    const mockFile = createMockFile('test.txt', 1000);

    component.component.$set({ selectedFiles: [mockFile] });

    await waitFor(() => {
      expect(screen.getByTestId('file-preview')).toBeInTheDocument();
      expect(screen.getByText('test.txt')).toBeInTheDocument();
      expect(screen.getByText('1.0 KB')).toBeInTheDocument();
    });
  });

  it('allows removing individual files', async () => {
    const component = render(FileDropZone);
    const mockFiles = [
      createMockFile('file1.txt', 1000),
      createMockFile('file2.txt', 2000)
    ];
    let selectedFiles: File[] = mockFiles;

    component.component.$set({ selectedFiles: mockFiles });
    component.component.$on('filesSelected', (event) => {
      selectedFiles = event.detail;
    });

    await waitFor(() => {
      const removeButton = screen.getByTestId('remove-file-0');
      fireEvent.click(removeButton);
    });

    expect(selectedFiles).toHaveLength(1);
    expect(selectedFiles[0].name).toBe('file2.txt');
  });

  it('allows clearing all files', async () => {
    const component = render(FileDropZone, { multiple: true });
    const mockFiles = [
      createMockFile('file1.txt', 1000),
      createMockFile('file2.txt', 2000)
    ];
    let selectedFiles: File[] = mockFiles;

    component.component.$set({ selectedFiles: mockFiles });
    component.component.$on('filesSelected', (event) => {
      selectedFiles = event.detail;
    });

    await waitFor(() => {
      const clearButton = screen.getByTestId('clear-files');
      fireEvent.click(clearButton);
    });

    expect(selectedFiles).toHaveLength(0);
  });

  it('respects disabled state', async () => {
    const component = render(FileDropZone, { disabled: true });
    const mockFile = createMockFile('test.txt', 1000);
    let selectedFiles: File[] = [];

    component.component.$on('filesSelected', (event) => {
      selectedFiles = event.detail;
    });

    const dropzone = screen.getByTestId('dropzone');
    expect(dropzone).toHaveClass('disabled');

    // Try to drop files - should be ignored
    const dragEvent = createMockDragEvent([mockFile]);
    await fireEvent.drop(dropzone, dragEvent);

    expect(selectedFiles).toHaveLength(0);

    // Try to click - should not open file browser
    await fireEvent.click(dropzone);
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it('handles keyboard navigation', async () => {
    mockOpen.mockResolvedValue('/path/to/file.txt');
    mockReadBinaryFile.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

    render(FileDropZone);
    const dropzone = screen.getByTestId('dropzone');

    await fireEvent.keyDown(dropzone, { key: 'Enter' });

    expect(mockOpen).toHaveBeenCalled();
  });

  it('shows file type badges when available', async () => {
    const component = render(FileDropZone);
    const mockFile = createMockFile('document.pdf', 1000, 'application/pdf');

    component.component.$set({ selectedFiles: [mockFile] });

    await waitFor(() => {
      expect(screen.getByText('application/pdf')).toBeInTheDocument();
    });
  });

  it('shows file modification date', async () => {
    const component = render(FileDropZone);
    const mockFile = createMockFile('test.txt', 1000);
    // Set a specific last modified date
    Object.defineProperty(mockFile, 'lastModified', {
      value: new Date('2024-01-01').getTime(),
      writable: false
    });

    component.component.$set({ selectedFiles: [mockFile] });

    await waitFor(() => {
      expect(screen.getByText('1/1/2024')).toBeInTheDocument();
    });
  });

  it('handles file browser errors gracefully', async () => {
    mockOpen.mockRejectedValue(new Error('File dialog failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(FileDropZone);
    const dropzone = screen.getByTestId('dropzone');

    await fireEvent.click(dropzone);

    expect(consoleSpy).toHaveBeenCalledWith('Failed to open file dialog:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('handles file reading errors gracefully', async () => {
    mockOpen.mockResolvedValue('/path/to/file.txt');
    mockReadBinaryFile.mockRejectedValue(new Error('File read failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(FileDropZone);
    const dropzone = screen.getByTestId('dropzone');

    await fireEvent.click(dropzone);

    expect(consoleSpy).toHaveBeenCalledWith('Failed to read file /path/to/file.txt:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });
});