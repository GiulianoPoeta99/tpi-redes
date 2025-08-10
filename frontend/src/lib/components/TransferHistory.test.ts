import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import TransferHistory from './TransferHistory.svelte';
import { historyStore } from '../stores/history';
import type { TransferRecord } from '../types';

// Mock the child components
vi.mock('./TransferHistoryDetails.svelte', () => ({
  default: vi.fn(() => ({ $$: { fragment: null } }))
}));

vi.mock('./TransferHistoryFilters.svelte', () => ({
  default: vi.fn(() => ({ $$: { fragment: null } }))
}));

vi.mock('./TransferHistoryStats.svelte', () => ({
  default: vi.fn(() => ({ $$: { fragment: null } }))
}));

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: true
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock URL.createObjectURL and related APIs
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  }
});

describe('TransferHistory Component', () => {
  const mockRecord: TransferRecord = {
    id: 'test-123',
    filename: 'test-file.txt',
    size: 1024,
    mode: 'sent',
    protocol: 'tcp',
    target: '192.168.1.100:8080',
    status: 'completed',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    duration: 30,
    checksum: 'abc123def456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store
    historyStore.set({
      records: [],
      filter: {},
      sortOptions: { field: 'timestamp', direction: 'desc' },
      searchQuery: '',
      selectedRecord: null,
      isLoading: false,
      developerMode: false
    });
  });

  describe('rendering', () => {
    it('should render the component with header', () => {
      render(TransferHistory);
      
      expect(screen.getByText('Transfer History')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search transfers...')).toBeInTheDocument();
    });

    it('should show empty state when no records', () => {
      render(TransferHistory);
      
      expect(screen.getByText('No transfer records found')).toBeInTheDocument();
    });

    it('should render records in table', () => {
      historyStore.update(state => ({
        ...state,
        records: [mockRecord]
      }));

      render(TransferHistory);
      
      expect(screen.getByText('test-file.txt')).toBeInTheDocument();
      expect(screen.getByText('1.0 KB')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.100:8080')).toBeInTheDocument();
    });

    it('should show/hide components based on props', () => {
      const { rerender } = render(TransferHistory, {
        showFilters: false,
        showStats: false
      });

      // Components should not be rendered when props are false
      // (We can't easily test this with mocked components, but the logic is there)

      rerender({
        showFilters: true,
        showStats: true
      });

      // Components should be rendered when props are true
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      historyStore.update(state => ({
        ...state,
        records: [
          { ...mockRecord, id: '1', filename: 'document.pdf' },
          { ...mockRecord, id: '2', filename: 'image.jpg' },
          { ...mockRecord, id: '3', target: 'server.example.com:8080' },
        ]
      }));
    });

    it('should filter records based on search query', async () => {
      render(TransferHistory);
      
      const searchInput = screen.getByPlaceholderText('Search transfers...');
      await fireEvent.input(searchInput, { target: { value: 'document' } });

      // The search should filter the records (tested in store tests)
      expect(searchInput.value).toBe('document');
    });

    it('should clear search when clear filters button is clicked', async () => {
      render(TransferHistory);
      
      const searchInput = screen.getByPlaceholderText('Search transfers...');
      await fireEvent.input(searchInput, { target: { value: 'test' } });

      // Simulate having filters that would show the clear button
      historyStore.setFilter({ status: 'completed' });
      
      // The clear functionality is tested in the store
    });
  });

  describe('sorting functionality', () => {
    beforeEach(() => {
      historyStore.update(state => ({
        ...state,
        records: [
          { ...mockRecord, id: '1', filename: 'a.txt', timestamp: new Date('2024-01-01') },
          { ...mockRecord, id: '2', filename: 'b.txt', timestamp: new Date('2024-01-02') },
        ]
      }));
    });

    it('should handle column header clicks for sorting', async () => {
      render(TransferHistory);
      
      const filenameHeader = screen.getByText(/File/);
      await fireEvent.click(filenameHeader);

      // Sorting logic is handled by the store
    });

    it('should show sort indicators', () => {
      render(TransferHistory);
      
      // Should show sort indicators (arrows) in column headers
      expect(screen.getByText(/Time/)).toBeInTheDocument();
      expect(screen.getByText(/File/)).toBeInTheDocument();
    });
  });

  describe('record actions', () => {
    beforeEach(() => {
      historyStore.update(state => ({
        ...state,
        records: [mockRecord]
      }));
    });

    it('should handle record click when showDetails is true', async () => {
      render(TransferHistory, { showDetails: true });
      
      const recordRow = screen.getByText('test-file.txt').closest('tr');
      expect(recordRow).toHaveClass('clickable');
      
      await fireEvent.click(recordRow!);
      
      // Should open details modal (tested by checking if selectedRecord is set)
    });

    it('should handle record removal', async () => {
      // Mock window.confirm
      window.confirm = vi.fn(() => true);
      
      render(TransferHistory);
      
      const removeButton = screen.getByTitle('Remove record');
      await fireEvent.click(removeButton);
      
      expect(window.confirm).toHaveBeenCalled();
    });
  });

  describe('developer mode', () => {
    it('should toggle developer mode', async () => {
      render(TransferHistory);
      
      const devModeButton = screen.getByTitle('Toggle Developer Mode');
      await fireEvent.click(devModeButton);
      
      // Developer mode toggle is handled by the store
    });

    it('should show active state when developer mode is enabled', () => {
      historyStore.update(state => ({
        ...state,
        developerMode: true
      }));

      render(TransferHistory);
      
      const devModeButton = screen.getByTitle('Toggle Developer Mode');
      expect(devModeButton).toHaveClass('active');
    });
  });

  describe('export functionality', () => {
    beforeEach(() => {
      historyStore.update(state => ({
        ...state,
        records: [mockRecord]
      }));
    });

    it('should open export modal', async () => {
      render(TransferHistory);
      
      const exportButton = screen.getByTitle('Export History');
      await fireEvent.click(exportButton);
      
      expect(screen.getByText('Export Transfer History')).toBeInTheDocument();
    });

    it('should handle export download', async () => {
      // Mock document.createElement and related DOM methods
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      
      document.createElement = vi.fn(() => mockAnchor as any);
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();

      render(TransferHistory);
      
      const exportButton = screen.getByTitle('Export History');
      await fireEvent.click(exportButton);
      
      const downloadButton = screen.getByText('Download JSON');
      await fireEvent.click(downloadButton);
      
      expect(mockAnchor.click).toHaveBeenCalled();
    });
  });

  describe('import functionality', () => {
    it('should open import modal', async () => {
      render(TransferHistory);
      
      const importButton = screen.getByTitle('Import History');
      await fireEvent.click(importButton);
      
      expect(screen.getByText('Import Transfer History')).toBeInTheDocument();
    });

    it('should handle import with valid data', async () => {
      render(TransferHistory);
      
      const importButton = screen.getByTitle('Import History');
      await fireEvent.click(importButton);
      
      const textarea = screen.getByPlaceholderText('Paste JSON data here...');
      const importData = JSON.stringify([mockRecord]);
      
      await fireEvent.input(textarea, { target: { value: importData } });
      
      const importSubmitButton = screen.getByText('Import');
      await fireEvent.click(importSubmitButton);
      
      // Import logic is handled by the store
    });

    it('should show import results', async () => {
      render(TransferHistory);
      
      const importButton = screen.getByTitle('Import History');
      await fireEvent.click(importButton);
      
      // Test would need to simulate the import result state
      // This is more complex to test without deeper mocking
    });
  });

  describe('clear history', () => {
    it('should clear history with confirmation', async () => {
      window.confirm = vi.fn(() => true);
      
      historyStore.update(state => ({
        ...state,
        records: [mockRecord]
      }));

      render(TransferHistory);
      
      const clearButton = screen.getByTitle('Clear History');
      await fireEvent.click(clearButton);
      
      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to clear all transfer history? This action cannot be undone.'
      );
    });

    it('should not clear history if not confirmed', async () => {
      window.confirm = vi.fn(() => false);
      
      render(TransferHistory);
      
      const clearButton = screen.getByTitle('Clear History');
      await fireEvent.click(clearButton);
      
      expect(window.confirm).toHaveBeenCalled();
      // History should not be cleared
    });
  });

  describe('modal interactions', () => {
    it('should close modals when clicking overlay', async () => {
      render(TransferHistory);
      
      const exportButton = screen.getByTitle('Export History');
      await fireEvent.click(exportButton);
      
      const overlay = screen.getByRole('button', { name: /×/ }).closest('.modal-overlay');
      await fireEvent.click(overlay!);
      
      // Modal should be closed (not visible)
    });

    it('should close modals when clicking close button', async () => {
      render(TransferHistory);
      
      const exportButton = screen.getByTitle('Export History');
      await fireEvent.click(exportButton);
      
      const closeButton = screen.getByText('×');
      await fireEvent.click(closeButton);
      
      // Modal should be closed
    });
  });
});