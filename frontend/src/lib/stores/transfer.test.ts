// Tests for transfer store functionality
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { transferStore } from './transfer';
import type { 
  TransferStartedEvent,
  TransferProgressEvent,
  TransferErrorEvent,
  TransferCompletedEvent,
  TransferCancelledEvent
} from '../tauri-events';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {}))
}));

vi.mock('$app/environment', () => ({
  browser: true
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Transfer Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset store state
    transferStore.set({
      currentTransfer: null,
      history: [],
      config: {
        mode: 'Transmitter',
        protocol: 'Tcp',
        port: 8080,
        chunk_size: 8192,
        timeout: 30,
      },
      isInitialized: false,
      connectionStatus: 'disconnected',
      lastError: null
    });
  });

  describe('Event Handlers', () => {
    it('should handle transfer started events', () => {
      const startedEvent: TransferStartedEvent = {
        transfer_id: 'test-transfer-1',
        filename: 'test.txt',
        file_size: 1024,
        protocol: 'Tcp',
        mode: 'Transmitter',
        timestamp: Date.now()
      };

      transferStore.handleTransferStarted(startedEvent);

      const state = get(transferStore);
      expect(state.currentTransfer).toBeDefined();
      expect(state.currentTransfer?.transfer_id).toBe('test-transfer-1');
      expect(state.currentTransfer?.status).toBe('Connecting');
      expect(state.currentTransfer?.total_bytes).toBe(1024);
      expect(state.currentTransfer?.progress).toBe(0);
    });

    it('should handle progress updates for matching transfer', () => {
      // First start a transfer
      const startedEvent: TransferStartedEvent = {
        transfer_id: 'test-transfer-1',
        filename: 'test.txt',
        file_size: 1024,
        protocol: 'Tcp',
        mode: 'Transmitter',
        timestamp: Date.now()
      };
      transferStore.handleTransferStarted(startedEvent);

      // Then update progress
      const progressEvent: TransferProgressEvent = {
        transfer_id: 'test-transfer-1',
        progress: 0.5,
        speed: 1024,
        eta: 30,
        bytes_transferred: 512,
        total_bytes: 1024,
        timestamp: Date.now()
      };

      transferStore.handleTransferProgress(progressEvent);

      const state = get(transferStore);
      expect(state.currentTransfer?.progress).toBe(0.5);
      expect(state.currentTransfer?.speed).toBe(1024);
      expect(state.currentTransfer?.eta).toBe(30);
      expect(state.currentTransfer?.bytes_transferred).toBe(512);
      expect(state.currentTransfer?.status).toBe('Transferring');
    });

    it('should ignore progress updates for non-matching transfer', () => {
      const progressEvent: TransferProgressEvent = {
        transfer_id: 'non-existent-transfer',
        progress: 0.5,
        speed: 1024,
        eta: 30,
        bytes_transferred: 512,
        total_bytes: 1024,
        timestamp: Date.now()
      };

      transferStore.handleTransferProgress(progressEvent);

      const state = get(transferStore);
      expect(state.currentTransfer).toBeNull();
    });

    it('should handle transfer errors and add to history', () => {
      // Start a transfer first
      const startedEvent: TransferStartedEvent = {
        transfer_id: 'test-transfer-1',
        filename: 'test.txt',
        file_size: 1024,
        protocol: 'Tcp',
        mode: 'Transmitter',
        timestamp: Date.now()
      };
      transferStore.handleTransferStarted(startedEvent);

      const errorEvent: TransferErrorEvent = {
        transfer_id: 'test-transfer-1',
        error_message: 'Connection failed',
        error_code: 'NETWORK_ERROR',
        recoverable: true,
        timestamp: Date.now()
      };

      transferStore.handleTransferError(errorEvent);

      const state = get(transferStore);
      expect(state.currentTransfer?.status).toBe('Error');
      expect(state.currentTransfer?.error).toBe('Connection failed');
      expect(state.lastError).toBeDefined();
      expect(state.lastError?.code).toBe('NETWORK_ERROR');
      expect(state.history).toHaveLength(1);
      expect(state.history[0].status).toBe('failed');
    });

    it('should handle successful completion and add to history', () => {
      // Start a transfer first
      const startedEvent: TransferStartedEvent = {
        transfer_id: 'test-transfer-1',
        filename: 'test.txt',
        file_size: 1024,
        protocol: 'Tcp',
        mode: 'Transmitter',
        timestamp: Date.now()
      };
      transferStore.handleTransferStarted(startedEvent);

      const completedEvent: TransferCompletedEvent = {
        transfer_id: 'test-transfer-1',
        success: true,
        bytes_transferred: 1024,
        duration: 30,
        checksum: 'abc123',
        timestamp: Date.now()
      };

      transferStore.handleTransferCompleted(completedEvent);

      const state = get(transferStore);
      expect(state.currentTransfer?.status).toBe('Completed');
      expect(state.currentTransfer?.progress).toBe(1.0);
      expect(state.history).toHaveLength(1);
      expect(state.history[0].status).toBe('completed');
      expect(state.history[0].checksum).toBe('abc123');
    });

    it('should handle transfer cancellation', () => {
      // Start a transfer first
      const startedEvent: TransferStartedEvent = {
        transfer_id: 'test-transfer-1',
        filename: 'test.txt',
        file_size: 1024,
        protocol: 'Tcp',
        mode: 'Transmitter',
        timestamp: Date.now()
      };
      transferStore.handleTransferStarted(startedEvent);

      const cancelledEvent: TransferCancelledEvent = {
        transfer_id: 'test-transfer-1',
        reason: 'User cancelled',
        timestamp: Date.now()
      };

      transferStore.handleTransferCancelled(cancelledEvent);

      const state = get(transferStore);
      expect(state.currentTransfer?.status).toBe('Cancelled');
      expect(state.history).toHaveLength(1);
      expect(state.history[0].status).toBe('cancelled');
    });
  });

  describe('History Management', () => {
    it('should save and load history from localStorage', () => {
      const mockHistory = [
        {
          id: 'test-1',
          filename: 'test.txt',
          size: 1024,
          mode: 'sent' as const,
          protocol: 'tcp' as const,
          target: 'localhost:8080',
          status: 'completed' as const,
          timestamp: new Date('2024-01-01T12:00:00Z'),
          duration: 30,
          checksum: 'abc123'
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockHistory));

      transferStore.loadHistory();

      const state = get(transferStore);
      expect(state.history).toHaveLength(1);
      expect(state.history[0].filename).toBe('test.txt');
      expect(state.history[0].timestamp).toBeInstanceOf(Date);
    });

    it('should handle corrupted history data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      transferStore.loadHistory();

      const state = get(transferStore);
      expect(state.history).toHaveLength(0);
    });

    it('should save history to localStorage', () => {
      const history = [
        {
          id: 'test-1',
          filename: 'test.txt',
          size: 1024,
          mode: 'sent' as const,
          protocol: 'tcp' as const,
          target: 'localhost:8080',
          status: 'completed' as const,
          timestamp: new Date(),
          duration: 30,
          checksum: 'abc123'
        }
      ];

      transferStore.saveHistory(history);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'file-transfer-history',
        JSON.stringify(history)
      );
    });

    it('should clear history', () => {
      // Add some history first
      transferStore.update(state => ({
        ...state,
        history: [
          {
            id: 'test-1',
            filename: 'test.txt',
            size: 1024,
            mode: 'sent' as const,
            protocol: 'tcp' as const,
            target: 'localhost:8080',
            status: 'completed' as const,
            timestamp: new Date(),
            duration: 30,
            checksum: 'abc123'
          }
        ]
      }));

      transferStore.clearHistory();

      const state = get(transferStore);
      expect(state.history).toHaveLength(0);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('file-transfer-history');
    });
  });

  describe('Error Management', () => {
    it('should clear errors', () => {
      // Set an error first
      transferStore.update(state => ({
        ...state,
        lastError: {
          message: 'Test error',
          code: 'TEST_ERROR',
          transferId: 'test-1',
          recoverable: false,
          name: 'TransferError'
        }
      }));

      transferStore.clearError();

      const state = get(transferStore);
      expect(state.lastError).toBeNull();
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        protocol: 'Udp' as const,
        port: 9090
      };

      transferStore.updateConfig(newConfig);

      const state = get(transferStore);
      expect(state.config.protocol).toBe('Udp');
      expect(state.config.port).toBe(9090);
      expect(state.config.mode).toBe('Transmitter'); // Should preserve other fields
    });
  });

  describe('Derived Stores', () => {
    it('should provide current transfer derived store', async () => {
      const { currentTransfer } = await import('./transfer');
      
      // Start a transfer
      const startedEvent: TransferStartedEvent = {
        transfer_id: 'test-transfer-1',
        filename: 'test.txt',
        file_size: 1024,
        protocol: 'Tcp',
        mode: 'Transmitter',
        timestamp: Date.now()
      };
      transferStore.handleTransferStarted(startedEvent);

      const current = get(currentTransfer);
      expect(current?.transfer_id).toBe('test-transfer-1');
    });

    it('should provide transfer history derived store', async () => {
      const { transferHistory } = await import('./transfer');
      
      // Add some history
      transferStore.update(state => ({
        ...state,
        history: [
          {
            id: 'test-1',
            filename: 'test.txt',
            size: 1024,
            mode: 'sent' as const,
            protocol: 'tcp' as const,
            target: 'localhost:8080',
            status: 'completed' as const,
            timestamp: new Date(),
            duration: 30,
            checksum: 'abc123'
          }
        ]
      }));

      const history = get(transferHistory);
      expect(history).toHaveLength(1);
      expect(history[0].filename).toBe('test.txt');
    });

    it('should provide isTransferActive derived store', async () => {
      const { isTransferActive } = await import('./transfer');
      
      // Initially not active
      expect(get(isTransferActive)).toBe(false);
      
      // Start a transfer
      const startedEvent: TransferStartedEvent = {
        transfer_id: 'test-transfer-1',
        filename: 'test.txt',
        file_size: 1024,
        protocol: 'Tcp',
        mode: 'Transmitter',
        timestamp: Date.now()
      };
      transferStore.handleTransferStarted(startedEvent);

      // Should be active (Connecting status)
      expect(get(isTransferActive)).toBe(true);

      // Update to transferring
      const progressEvent: TransferProgressEvent = {
        transfer_id: 'test-transfer-1',
        progress: 0.5,
        speed: 1024,
        eta: 30,
        bytes_transferred: 512,
        total_bytes: 1024,
        timestamp: Date.now()
      };
      transferStore.handleTransferProgress(progressEvent);

      // Should still be active (Transferring status)
      expect(get(isTransferActive)).toBe(true);

      // Complete the transfer
      const completedEvent: TransferCompletedEvent = {
        transfer_id: 'test-transfer-1',
        success: true,
        bytes_transferred: 1024,
        duration: 30,
        checksum: 'abc123',
        timestamp: Date.now()
      };
      transferStore.handleTransferCompleted(completedEvent);

      // Should not be active (Completed status)
      expect(get(isTransferActive)).toBe(false);
    });
  });
});