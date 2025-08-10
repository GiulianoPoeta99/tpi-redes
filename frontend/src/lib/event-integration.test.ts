// Integration tests for event handling and state management
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import type { 
  TransferStartedEvent,
  TransferProgressEvent,
  TransferErrorEvent,
  TransferCompletedEvent,
  TransferCancelledEvent,
  TransferConnectionEvent
} from './tauri-events';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})) // Return a mock unlisten function
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

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: class MockNotification {
    static permission = 'granted';
    static requestPermission = vi.fn().mockResolvedValue('granted');
    constructor(public title: string, public options: any) {}
  }
});

// Mock AudioContext
Object.defineProperty(window, 'AudioContext', {
  value: class MockAudioContext {
    createOscillator = vi.fn(() => ({
      connect: vi.fn(),
      frequency: { setValueAtTime: vi.fn() },
      type: 'sine',
      start: vi.fn(),
      stop: vi.fn()
    }));
    createGain = vi.fn(() => ({
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      }
    }));
    destination = {};
    currentTime = 0;
  }
});

describe('EventIntegrationService', () => {
  let eventService: EventIntegrationService;
  let mockEventListeners: Map<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset event listeners map
    mockEventListeners = new Map();

    eventService = new EventIntegrationService({
      enableNotifications: true,
      enableSounds: false,
      autoRetryOnError: true,
      maxRetryAttempts: 2,
      retryDelayMs: 100
    });
  });

  afterEach(async () => {
    await eventService.cleanup();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await eventService.initialize();
      expect(mockEventListeners.size).toBeGreaterThan(0);
    });

    it('should handle initialization errors gracefully', async () => {
      const mockError = new Error('Initialization failed');
      vi.doMock('./tauri-events', () => ({
        eventManager: {
          setupEventListeners: vi.fn().mockRejectedValue(mockError)
        }
      }));

      await expect(eventService.initialize()).rejects.toThrow('Initialization failed');
    });
  });

  describe('Transfer Started Events', () => {
    it('should handle transfer started events correctly', async () => {
      await eventService.initialize();
      
      const startedEvent: TransferStartedEvent = {
        transfer_id: 'test-transfer-1',
        filename: 'test.txt',
        file_size: 1024,
        protocol: 'Tcp',
        mode: 'Transmitter',
        timestamp: Date.now()
      };

      const handler = mockEventListeners.get('onStarted');
      expect(handler).toBeDefined();
      
      // Trigger the event
      handler!(startedEvent);

      // Check that store was updated
      const state = get(transferStore);
      expect(state.currentTransfer).toBeDefined();
      expect(state.currentTransfer?.transfer_id).toBe('test-transfer-1');
      expect(state.currentTransfer?.status).toBe('Connecting');
      expect(state.currentTransfer?.total_bytes).toBe(1024);
    });

    it('should show notification for transfer started', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
      
      await eventService.initialize();
      
      const startedEvent: TransferStartedEvent = {
        transfer_id: 'test-transfer-1',
        filename: 'test.txt',
        file_size: 1024,
        protocol: 'Tcp',
        mode: 'Transmitter',
        timestamp: Date.now()
      };

      const handler = mockEventListeners.get('onStarted');
      handler!(startedEvent);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transfer-notification',
          detail: expect.objectContaining({
            title: 'Transfer Started',
            type: 'info'
          })
        })
      );
    });
  });

  describe('Transfer Progress Events', () => {
    it('should handle progress updates correctly', async () => {
      await eventService.initialize();
      
      // First start a transfer
      const startedEvent: TransferStartedEvent = {
        transfer_id: 'test-transfer-1',
        filename: 'test.txt',
        file_size: 1024,
        protocol: 'Tcp',
        mode: 'Transmitter',
        timestamp: Date.now()
      };
      
      const startHandler = mockEventListeners.get('onStarted');
      startHandler!(startedEvent);

      // Then send progress update
      const progressEvent: TransferProgressEvent = {
        transfer_id: 'test-transfer-1',
        progress: 0.5,
        speed: 1024,
        eta: 30,
        bytes_transferred: 512,
        total_bytes: 1024,
        timestamp: Date.now()
      };

      const progressHandler = mockEventListeners.get('onProgress');
      progressHandler!(progressEvent);

      const state = get(transferStore);
      expect(state.currentTransfer?.progress).toBe(0.5);
      expect(state.currentTransfer?.speed).toBe(1024);
      expect(state.currentTransfer?.eta).toBe(30);
      expect(state.currentTransfer?.bytes_transferred).toBe(512);
      expect(state.currentTransfer?.status).toBe('Transferring');
    });

    it('should ignore progress for non-matching transfer IDs', async () => {
      await eventService.initialize();
      
      const progressEvent: TransferProgressEvent = {
        transfer_id: 'non-existent-transfer',
        progress: 0.5,
        speed: 1024,
        eta: 30,
        bytes_transferred: 512,
        total_bytes: 1024,
        timestamp: Date.now()
      };

      const progressHandler = mockEventListeners.get('onProgress');
      progressHandler!(progressEvent);

      const state = get(transferStore);
      expect(state.currentTransfer).toBeNull();
    });
  });

  describe('Transfer Error Events', () => {
    it('should handle transfer errors correctly', async () => {
      await eventService.initialize();
      
      // Start a transfer first
      const startedEvent: TransferStartedEvent = {
        transfer_id: 'test-transfer-1',
        filename: 'test.txt',
        file_size: 1024,
        protocol: 'Tcp',
        mode: 'Transmitter',
        timestamp: Date.now()
      };
      
      const startHandler = mockEventListeners.get('onStarted');
      startHandler!(startedEvent);

      const errorEvent: TransferErrorEvent = {
        transfer_id: 'test-transfer-1',
        error_message: 'Connection failed',
        error_code: 'NETWORK_ERROR',
        recoverable: true,
        timestamp: Date.now()
      };

      const errorHandler = mockEventListeners.get('onError');
      errorHandler!(errorEvent);

      const state = get(transferStore);
      expect(state.currentTransfer?.status).toBe('Error');
      expect(state.currentTransfer?.error).toBe('Connection failed');
      expect(state.lastError).toBeDefined();
      expect(state.lastError?.code).toBe('NETWORK_ERROR');
      expect(state.history).toHaveLength(1);
      expect(state.history[0].status).toBe('failed');
    });

    it('should show error notification', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
      
      await eventService.initialize();
      
      const errorEvent: TransferErrorEvent = {
        transfer_id: 'test-transfer-1',
        error_message: 'Connection failed',
        error_code: 'NETWORK_ERROR',
        recoverable: false,
        timestamp: Date.now()
      };

      const errorHandler = mockEventListeners.get('onError');
      errorHandler!(errorEvent);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transfer-notification',
          detail: expect.objectContaining({
            title: 'Transfer Error',
            message: 'Transfer failed: Connection failed',
            type: 'error'
          })
        })
      );
    });
  });

  describe('Transfer Completed Events', () => {
    it('should handle successful completion correctly', async () => {
      await eventService.initialize();
      
      // Start a transfer first
      const startedEvent: TransferStartedEvent = {
        transfer_id: 'test-transfer-1',
        filename: 'test.txt',
        file_size: 1024,
        protocol: 'Tcp',
        mode: 'Transmitter',
        timestamp: Date.now()
      };
      
      const startHandler = mockEventListeners.get('onStarted');
      startHandler!(startedEvent);

      const completedEvent: TransferCompletedEvent = {
        transfer_id: 'test-transfer-1',
        success: true,
        bytes_transferred: 1024,
        duration: 30,
        checksum: 'abc123',
        timestamp: Date.now()
      };

      const completedHandler = mockEventListeners.get('onCompleted');
      completedHandler!(completedEvent);

      const state = get(transferStore);
      expect(state.currentTransfer?.status).toBe('Completed');
      expect(state.currentTransfer?.progress).toBe(1.0);
      expect(state.history).toHaveLength(1);
      expect(state.history[0].status).toBe('completed');
      expect(state.history[0].checksum).toBe('abc123');
    });

    it('should clear current transfer after delay', async () => {
      vi.useFakeTimers();
      
      await eventService.initialize();
      
      // Start and complete a transfer
      const startedEvent: TransferStartedEvent = {
        transfer_id: 'test-transfer-1',
        filename: 'test.txt',
        file_size: 1024,
        protocol: 'Tcp',
        mode: 'Transmitter',
        timestamp: Date.now()
      };
      
      const startHandler = mockEventListeners.get('onStarted');
      startHandler!(startedEvent);

      const completedEvent: TransferCompletedEvent = {
        transfer_id: 'test-transfer-1',
        success: true,
        bytes_transferred: 1024,
        duration: 30,
        checksum: 'abc123',
        timestamp: Date.now()
      };

      const completedHandler = mockEventListeners.get('onCompleted');
      completedHandler!(completedEvent);

      // Should still have current transfer
      expect(get(transferStore).currentTransfer).toBeDefined();

      // Fast-forward time
      vi.advanceTimersByTime(3000);

      // Should clear current transfer
      expect(get(transferStore).currentTransfer).toBeNull();
      
      vi.useRealTimers();
    });
  });

  describe('Transfer Cancelled Events', () => {
    it('should handle cancellation correctly', async () => {
      await eventService.initialize();
      
      // Start a transfer first
      const startedEvent: TransferStartedEvent = {
        transfer_id: 'test-transfer-1',
        filename: 'test.txt',
        file_size: 1024,
        protocol: 'Tcp',
        mode: 'Transmitter',
        timestamp: Date.now()
      };
      
      const startHandler = mockEventListeners.get('onStarted');
      startHandler!(startedEvent);

      const cancelledEvent: TransferCancelledEvent = {
        transfer_id: 'test-transfer-1',
        reason: 'User cancelled',
        timestamp: Date.now()
      };

      const cancelledHandler = mockEventListeners.get('onCancelled');
      cancelledHandler!(cancelledEvent);

      const state = get(transferStore);
      expect(state.currentTransfer?.status).toBe('Cancelled');
      expect(state.history).toHaveLength(1);
      expect(state.history[0].status).toBe('cancelled');
    });
  });

  describe('Connection Events', () => {
    it('should handle connection events correctly', async () => {
      await eventService.initialize();
      
      const connectionEvent: TransferConnectionEvent = {
        transfer_id: 'test-transfer-1',
        event_type: 'connected',
        address: '192.168.1.100:8080',
        protocol: 'Tcp',
        timestamp: Date.now()
      };

      const connectionHandler = mockEventListeners.get('onConnection');
      connectionHandler!(connectionEvent);

      const state = get(transferStore);
      expect(state.connectionStatus).toBe('connected');
    });

    it('should show connection notifications', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
      
      await eventService.initialize();
      
      const connectionEvent: TransferConnectionEvent = {
        event_type: 'listening',
        address: 'localhost:8080',
        protocol: 'Tcp',
        timestamp: Date.now()
      };

      const connectionHandler = mockEventListeners.get('onConnection');
      connectionHandler!(connectionEvent);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transfer-notification',
          detail: expect.objectContaining({
            title: 'Listening',
            type: 'info'
          })
        })
      );
    });
  });

  describe('State Persistence', () => {
    it('should save and load transfer history', async () => {
      const mockHistory = [
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

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockHistory));

      await transferStore.initialize();

      const state = get(transferStore);
      expect(state.history).toHaveLength(1);
      expect(state.history[0].filename).toBe('test.txt');
    });

    it('should handle corrupted history data gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      await transferStore.initialize();

      const state = get(transferStore);
      expect(state.history).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should clear errors when requested', async () => {
      await eventService.initialize();
      
      const errorEvent: TransferErrorEvent = {
        transfer_id: 'test-transfer-1',
        error_message: 'Test error',
        error_code: 'TEST_ERROR',
        recoverable: false,
        timestamp: Date.now()
      };

      const errorHandler = mockEventListeners.get('onError');
      errorHandler!(errorEvent);

      // Should have error
      expect(get(transferStore).lastError).toBeDefined();

      // Clear error
      transferStore.clearError();

      // Should not have error
      expect(get(transferStore).lastError).toBeNull();
    });
  });
});

describe('Notification Store Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationStore.clear();
  });

  it('should receive custom notification events', () => {
    const event = new CustomEvent('transfer-notification', {
      detail: {
        title: 'Test Notification',
        message: 'Test message',
        type: 'info'
      }
    });

    window.dispatchEvent(event);

    const notifications = get(notificationStore);
    expect(notifications.notifications).toHaveLength(1);
    expect(notifications.notifications[0].title).toBe('Test Notification');
    expect(notifications.notifications[0].type).toBe('info');
  });

  it('should auto-dismiss notifications after duration', () => {
    vi.useFakeTimers();

    const id = notificationStore.add({
      title: 'Test',
      message: 'Test message',
      type: 'info',
      duration: 1000
    });

    // Should have notification
    expect(get(notificationStore).notifications).toHaveLength(1);

    // Fast-forward time
    vi.advanceTimersByTime(1000);

    // Should auto-dismiss
    expect(get(notificationStore).notifications).toHaveLength(0);

    vi.useRealTimers();
  });

  it('should not auto-dismiss persistent notifications', () => {
    vi.useFakeTimers();

    const id = notificationStore.add({
      title: 'Test',
      message: 'Test message',
      type: 'error',
      persistent: true
    });

    // Should have notification
    expect(get(notificationStore).notifications).toHaveLength(1);

    // Fast-forward time
    vi.advanceTimersByTime(10000);

    // Should still have notification
    expect(get(notificationStore).notifications).toHaveLength(1);

    vi.useRealTimers();
  });
});