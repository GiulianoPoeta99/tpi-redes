import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TransferHistoryItem } from '../../../shared/services/StorageService';
import HistoryModal from '../HistoryModal';

const mockLoadHistory = vi.fn().mockReturnValue([]);
const mockClearHistory = vi.fn();

vi.mock('../../../shared/services/StorageService', () => ({
  StorageService: {
    loadHistory: () => mockLoadHistory(),
    clearHistory: () => mockClearHistory(),
  },
}));

describe('HistoryModal', () => {
  const mockOnClose = vi.fn();

  it('renders nothing when history is empty', () => {
    mockLoadHistory.mockReturnValue([]);
    render(<HistoryModal onClose={mockOnClose} />);

    expect(screen.getByText('Transfer History')).toBeInTheDocument();
    expect(screen.getByText('No transfer history yet')).toBeInTheDocument();
  });

  it('renders history items correctly', () => {
    const mockHistory: TransferHistoryItem[] = [
      {
        id: '1',
        timestamp: Date.now(),
        filename: 'file1.txt',
        size: 1024,
        status: 'success',
        direction: 'sent',
        protocol: 'TCP',
      },
      {
        id: '2',
        timestamp: Date.now(),
        filename: 'error.log',
        size: 500,
        status: 'failed',
        direction: 'received',
        protocol: 'UDP',
      },
    ];
    mockLoadHistory.mockReturnValue(mockHistory);

    render(<HistoryModal onClose={mockOnClose} />);

    expect(screen.getByText('file1.txt')).toBeInTheDocument();
    expect(screen.getByText('error.log')).toBeInTheDocument();
    expect(screen.getByText('TCP')).toBeInTheDocument();
    expect(screen.getByText('UDP')).toBeInTheDocument();
  });

  it('calls clearHistory when Clear button is clicked', () => {
    mockLoadHistory.mockReturnValue([
      {
        id: '1',
        filename: 'foo',
        timestamp: 0,
        size: 0,
        status: 'success',
        direction: 'sent',
        protocol: 'TCP',
      },
    ]);

    render(<HistoryModal onClose={mockOnClose} />);

    const clearBtn = screen.getByTitle('Clear History');
    fireEvent.click(clearBtn);
    expect(mockClearHistory).toHaveBeenCalled();
  });
});
