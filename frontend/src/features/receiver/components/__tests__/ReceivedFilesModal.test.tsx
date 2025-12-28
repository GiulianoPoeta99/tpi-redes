import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as useReceivedFilesModule from '../../hooks/useReceivedFiles';
import { ReceivedFilesModal } from '../ReceivedFilesModal';

describe('ReceivedFilesModal', () => {
  const mockOnClose = vi.fn();
  const mockUseReceivedFiles = vi.spyOn(useReceivedFilesModule, 'useReceivedFiles');

  beforeEach(() => {
    mockUseReceivedFiles.mockReturnValue({
      files: [],
      loading: false,
      verifying: null,
      verificationResults: {},
      viewMode: 'list',
      setViewMode: vi.fn(),
      refreshFiles: vi.fn(),
      openFile: vi.fn(),
      openFolder: vi.fn(),
      verifyFile: vi.fn(),
    });
  });

  it('renders empty state correctly', () => {
    render(<ReceivedFilesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('No files found in received folder.')).toBeInTheDocument();
  });

  it('renders files list when data is present', () => {
    const files = [
      { name: 'doc.pdf', size: 1024, path: '/tmp/doc.pdf', receivedAt: Date.now() },
      { name: 'img.png', size: 2048, path: '/tmp/img.png', receivedAt: Date.now() },
    ];

    mockUseReceivedFiles.mockReturnValue({
      files,
      loading: false,
      verifying: null,
      verificationResults: {},
      viewMode: 'list',
      setViewMode: vi.fn(),
      refreshFiles: vi.fn(),
      openFile: vi.fn(),
      openFolder: vi.fn(),
      verifyFile: vi.fn(),
    } as unknown as ReturnType<typeof useReceivedFilesModule.useReceivedFiles>);

    render(<ReceivedFilesModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('doc.pdf')).toBeInTheDocument();
    expect(screen.getByText('img.png')).toBeInTheDocument();
  });
});
