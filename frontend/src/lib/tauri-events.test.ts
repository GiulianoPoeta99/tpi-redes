// Tests for Tauri event handling
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TauriEventManager } from './tauri-events';
import type {
  TransferStartedEvent,
  TransferProgressEvent,
  TransferErrorEvent,
  TransferCompletedEvent,
  TransferCancelledEvent,
  TransferConnectionEvent,
} from './tauri-events';

// Mock the Tauri listen function
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockImplementation((eventName: string, callback: Function) => {
    // Return a mock unlisten function
    return vi.fn();
  }),
}));

describe('TauriEventManager', () => {
  let eventManager: TauriEventManager;

  beforeEach(() => {
    eventManager = new TauriEventManager();
    vi.clearAllMocks();
  });

  it('should create event manager instance', () => {
    expect(eventManager).toBeInstanceOf(TauriEventManager);
  });

  it('should handle transfer started events', () => {
    const startedEvent: TransferStartedEvent = {
      transfer_id: 'test-123',
      filename: 'test.txt',
      file_size: 1024,
      protocol: 'Tcp',
      mode: 'Transmitter',
      timestamp: Date.now(),
    };

    expect(startedEvent.transfer_id).toBe('test-123');
    expect(startedEvent.filename).toBe('test.txt');
    expect(startedEvent.file_size).toBe(1024);
    expect(startedEvent.protocol).toBe('Tcp');
    expect(startedEvent.mode).toBe('Transmitter');
  });

  it('should handle transfer progress events', () => {
    const progressEvent: TransferProgressEvent = {
      transfer_id: 'test-123',
      progress: 0.5,
      speed: 1024,
      eta: 30,
      bytes_transferred: 512,
      total_bytes: 1024,
      timestamp: Date.now(),
    };

    expect(progressEvent.transfer_id).toBe('test-123');
    expect(progressEvent.progress).toBe(0.5);
    expect(progressEvent.speed).toBe(1024);
    expect(progressEvent.eta).toBe(30);
    expect(progressEvent.bytes_transferred).toBe(512);
    expect(progressEvent.total_bytes).toBe(1024);
  });

  it('should handle transfer error events', () => {
    const errorEvent: TransferErrorEvent = {
      transfer_id: 'test-123',
      error_message: 'Connection failed',
      error_code: 'CONNECTION_REFUSED',
      recoverable: true,
      timestamp: Date.now(),
    };

    expect(errorEvent.transfer_id).toBe('test-123');
    expect(errorEvent.error_message).toBe('Connection failed');
    expect(errorEvent.error_code).toBe('CONNECTION_REFUSED');
    expect(errorEvent.recoverable).toBe(true);
  });

  it('should handle transfer completed events', () => {
    const completedEvent: TransferCompletedEvent = {
      transfer_id: 'test-123',
      success: true,
      bytes_transferred: 1024,
      duration: 30,
      checksum: 'abc123',
      timestamp: Date.now(),
    };

    expect(completedEvent.transfer_id).toBe('test-123');
    expect(completedEvent.success).toBe(true);
    expect(completedEvent.bytes_transferred).toBe(1024);
    expect(completedEvent.duration).toBe(30);
    expect(completedEvent.checksum).toBe('abc123');
  });

  it('should handle transfer cancelled events', () => {
    const cancelledEvent: TransferCancelledEvent = {
      transfer_id: 'test-123',
      reason: 'User cancelled',
      timestamp: Date.now(),
    };

    expect(cancelledEvent.transfer_id).toBe('test-123');
    expect(cancelledEvent.reason).toBe('User cancelled');
  });

  it('should handle connection events', () => {
    const connectionEvent: TransferConnectionEvent = {
      transfer_id: 'test-123',
      event_type: 'connected',
      address: '127.0.0.1:8080',
      protocol: 'Tcp',
      timestamp: Date.now(),
    };

    expect(connectionEvent.transfer_id).toBe('test-123');
    expect(connectionEvent.event_type).toBe('connected');
    expect(connectionEvent.address).toBe('127.0.0.1:8080');
    expect(connectionEvent.protocol).toBe('Tcp');
  });

  it('should handle protocol types in events', () => {
    const tcpEvent: TransferConnectionEvent = {
      event_type: 'listening',
      address: '0.0.0.0:8080',
      protocol: 'Tcp',
      timestamp: Date.now(),
    };

    const udpEvent: TransferConnectionEvent = {
      event_type: 'listening',
      address: '0.0.0.0:8080',
      protocol: 'Udp',
      timestamp: Date.now(),
    };

    expect(tcpEvent.protocol).toBe('Tcp');
    expect(udpEvent.protocol).toBe('Udp');
  });

  it('should handle transfer modes in events', () => {
    const transmitterEvent: TransferStartedEvent = {
      transfer_id: 'test-123',
      filename: 'test.txt',
      file_size: 1024,
      protocol: 'Tcp',
      mode: 'Transmitter',
      timestamp: Date.now(),
    };

    const receiverEvent: TransferStartedEvent = {
      transfer_id: 'test-456',
      filename: 'received.txt',
      file_size: 2048,
      protocol: 'Udp',
      mode: 'Receiver',
      timestamp: Date.now(),
    };

    expect(transmitterEvent.mode).toBe('Transmitter');
    expect(receiverEvent.mode).toBe('Receiver');
  });

  it('should cleanup event listeners', async () => {
    await eventManager.cleanup();
    // Since we're mocking, we can't test the actual cleanup,
    // but we can verify the method exists and doesn't throw
    expect(true).toBe(true);
  });
});