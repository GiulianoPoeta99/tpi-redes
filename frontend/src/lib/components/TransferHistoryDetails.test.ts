import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import TransferHistoryDetails from './TransferHistoryDetails.svelte';
import { historyStore } from '../stores/history';
import type { TransferRecord } from '../types';

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: true
}));

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
  }
});

describe('TransferHistoryDetails Component', () => {
  const mockRecord: TransferRecord = {
    id: 'test-transfer-123',
    filename: 'important-document.pdf',
    size: 2048576, // 2MB
    mode: 'sent',
    protocol: 'tcp',
    target: '192.168.1.100:8080',
    status: 'completed',
    timestamp: new Date('2024-01-15T14:30:00Z'),
    duration: 45,
    checksum: 'sha256:abcdef123456789012345678901234567890abcdef123456789012345678901234',
  };

  const mockFailedRecord: TransferRecord = {
    ...mockRecord,
    id: 'failed-transfer-456',
    status: 'failed',
    error: 'Connection timeout after 30 seconds',
    checksum: '',
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

  describe('basic information display', () => {
    it('should display transfer information correctly', () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      expect(screen.getByText('test-transfer-123')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('45s')).toBeInTheDocument();
    });

    it('should display file information correctly', () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      expect(screen.getByText('important-document.pdf')).toBeInTheDocument();
      expect(screen.getByText('2.0 MB')).toBeInTheDocument();
      expect(screen.getByText('(2,048,576 bytes)')).toBeInTheDocument();
    });

    it('should display network information correctly', () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      expect(screen.getByText('📤 Sent')).toBeInTheDocument();
      expect(screen.getByText('TCP')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.100:8080')).toBeInTheDocument();
    });

    it('should calculate and display average speed', () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      // 2MB / 45s ≈ 45.5 KB/s
      expect(screen.getByText(/45\.5 KB\/s/)).toBeInTheDocument();
    });

    it('should show N/A for speed when duration is 0', () => {
      const recordWithZeroDuration = { ...mockRecord, duration: 0 };
      render(TransferHistoryDetails, { record: recordWithZeroDuration });
      
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('status indicators', () => {
    it('should show correct status color for completed transfer', () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      const statusIndicator = screen.getByText('Completed').previousElementSibling;
      expect(statusIndicator).toHaveStyle('background-color: #2e7d32');
    });

    it('should show correct status color for failed transfer', () => {
      render(TransferHistoryDetails, { record: mockFailedRecord });
      
      const statusIndicator = screen.getByText('Failed').previousElementSibling;
      expect(statusIndicator).toHaveStyle('background-color: #c62828');
    });

    it('should show correct protocol badge styling', () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      const tcpBadge = screen.getByText('TCP');
      expect(tcpBadge).toHaveClass('protocol-tcp');
    });
  });

  describe('error information', () => {
    it('should show error section for failed transfers', () => {
      render(TransferHistoryDetails, { record: mockFailedRecord });
      
      expect(screen.getByText('Error Information')).toBeInTheDocument();
      expect(screen.getByText('Connection timeout after 30 seconds')).toBeInTheDocument();
    });

    it('should not show error section for successful transfers', () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      expect(screen.queryByText('Error Information')).not.toBeInTheDocument();
    });
  });

  describe('developer mode', () => {
    it('should show developer section when developer mode is enabled', () => {
      historyStore.update(state => ({ ...state, developerMode: true }));
      
      render(TransferHistoryDetails, { record: mockRecord });
      
      expect(screen.getByText('🔧 Developer Information')).toBeInTheDocument();
      expect(screen.getByText('Raw Record Data')).toBeInTheDocument();
    });

    it('should not show developer section when developer mode is disabled', () => {
      historyStore.update(state => ({ ...state, developerMode: false }));
      
      render(TransferHistoryDetails, { record: mockRecord });
      
      expect(screen.queryByText('🔧 Developer Information')).not.toBeInTheDocument();
    });

    it('should display raw JSON data in developer mode', () => {
      historyStore.update(state => ({ ...state, developerMode: true }));
      
      render(TransferHistoryDetails, { record: mockRecord });
      
      const jsonData = screen.getByText(/"id": "test-transfer-123"/);
      expect(jsonData).toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    it('should copy transfer ID to clipboard', async () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      const copyButtons = screen.getAllByTitle('Copy to clipboard');
      await fireEvent.click(copyButtons[0]); // First copy button (transfer ID)
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-transfer-123');
    });

    it('should copy filename to clipboard', async () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      const copyButton = screen.getByTitle('Copy filename');
      await fireEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('important-document.pdf');
    });

    it('should copy checksum to clipboard', async () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      const copyButton = screen.getByTitle('Copy checksum');
      await fireEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockRecord.checksum);
    });

    it('should copy target address to clipboard', async () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      const copyButton = screen.getByTitle('Copy target address');
      await fireEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('192.168.1.100:8080');
    });

    it('should copy error message to clipboard', async () => {
      render(TransferHistoryDetails, { record: mockFailedRecord });
      
      const copyButton = screen.getByTitle('Copy error message');
      await fireEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Connection timeout after 30 seconds');
    });

    it('should copy raw JSON data to clipboard', async () => {
      historyStore.update(state => ({ ...state, developerMode: true }));
      
      render(TransferHistoryDetails, { record: mockRecord });
      
      const copyButton = screen.getByTitle('Copy raw data');
      await fireEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        JSON.stringify(mockRecord, null, 2)
      );
    });
  });

  describe('action buttons', () => {
    it('should have copy record data button', () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      expect(screen.getByText('📋 Copy Record Data')).toBeInTheDocument();
    });

    it('should have copy checksum button when checksum exists', () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      expect(screen.getByText('🔐 Copy Checksum')).toBeInTheDocument();
    });

    it('should not have copy checksum button when checksum is empty', () => {
      render(TransferHistoryDetails, { record: mockFailedRecord });
      
      expect(screen.queryByText('🔐 Copy Checksum')).not.toBeInTheDocument();
    });

    it('should have remove record button', () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      expect(screen.getByText('🗑️ Remove Record')).toBeInTheDocument();
    });

    it('should handle record removal with confirmation', async () => {
      window.confirm = vi.fn(() => true);
      
      render(TransferHistoryDetails, { record: mockRecord });
      
      const removeButton = screen.getByText('🗑️ Remove Record');
      await fireEvent.click(removeButton);
      
      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to remove this transfer record?'
      );
    });

    it('should not remove record if not confirmed', async () => {
      window.confirm = vi.fn(() => false);
      
      render(TransferHistoryDetails, { record: mockRecord });
      
      const removeButton = screen.getByText('🗑️ Remove Record');
      await fireEvent.click(removeButton);
      
      expect(window.confirm).toHaveBeenCalled();
      // Record should not be removed (tested in store)
    });
  });

  describe('timestamp formatting', () => {
    it('should format timestamp correctly', () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      // Should show formatted date with timezone
      expect(screen.getByText(/January 15, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/2:30:00 PM/)).toBeInTheDocument();
    });
  });

  describe('checksum display', () => {
    it('should display checksum when available', () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      expect(screen.getByText(mockRecord.checksum)).toBeInTheDocument();
    });

    it('should show N/A when checksum is not available', () => {
      render(TransferHistoryDetails, { record: mockFailedRecord });
      
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('mode and protocol badges', () => {
    it('should show correct mode badge for sent transfers', () => {
      render(TransferHistoryDetails, { record: mockRecord });
      
      expect(screen.getByText('📤 Sent')).toBeInTheDocument();
    });

    it('should show correct mode badge for received transfers', () => {
      const receivedRecord = { ...mockRecord, mode: 'received' as const };
      render(TransferHistoryDetails, { record: receivedRecord });
      
      expect(screen.getByText('📥 Received')).toBeInTheDocument();
    });

    it('should show correct protocol badge for UDP', () => {
      const udpRecord = { ...mockRecord, protocol: 'udp' as const };
      render(TransferHistoryDetails, { record: udpRecord });
      
      const udpBadge = screen.getByText('UDP');
      expect(udpBadge).toHaveClass('protocol-udp');
    });
  });
});