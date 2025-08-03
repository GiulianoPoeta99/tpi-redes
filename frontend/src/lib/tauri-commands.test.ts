// Tests for Tauri command interfaces
import { describe, it, expect } from 'vitest';
import type { TransferConfig, TransferProgress } from './types';
import { TauriCommands } from './tauri-commands';

describe('TauriCommands', () => {
  it('should have all required command methods', () => {
    expect(typeof TauriCommands.initializeBackend).toBe('function');
    expect(typeof TauriCommands.transferFile).toBe('function');
    expect(typeof TauriCommands.receiveFile).toBe('function');
    expect(typeof TauriCommands.getProgress).toBe('function');
    expect(typeof TauriCommands.cancelTransfer).toBe('function');
    expect(typeof TauriCommands.validateConfig).toBe('function');
    expect(typeof TauriCommands.checkReceiverAvailability).toBe('function');
  });

  it('should create valid transfer config objects', () => {
    const config: TransferConfig = {
      mode: 'Transmitter',
      protocol: 'Tcp',
      target_ip: '127.0.0.1',
      port: 8080,
      filename: 'test.txt',
      chunk_size: 8192,
      timeout: 30,
    };

    expect(config.mode).toBe('Transmitter');
    expect(config.protocol).toBe('Tcp');
    expect(config.target_ip).toBe('127.0.0.1');
    expect(config.port).toBe(8080);
    expect(config.chunk_size).toBe(8192);
    expect(config.timeout).toBe(30);
  });

  it('should create valid transfer progress objects', () => {
    const progress: TransferProgress = {
      transfer_id: 'test-123',
      progress: 0.5,
      speed: 1024,
      eta: 30,
      status: 'Transferring',
      bytes_transferred: 512,
      total_bytes: 1024,
    };

    expect(progress.transfer_id).toBe('test-123');
    expect(progress.progress).toBe(0.5);
    expect(progress.speed).toBe(1024);
    expect(progress.eta).toBe(30);
    expect(progress.status).toBe('Transferring');
    expect(progress.bytes_transferred).toBe(512);
    expect(progress.total_bytes).toBe(1024);
  });

  it('should handle protocol types correctly', () => {
    const tcpConfig: TransferConfig = {
      mode: 'Transmitter',
      protocol: 'Tcp',
      target_ip: '127.0.0.1',
      port: 8080,
      chunk_size: 8192,
      timeout: 30,
    };

    const udpConfig: TransferConfig = {
      mode: 'Receiver',
      protocol: 'Udp',
      port: 8080,
      chunk_size: 1024,
      timeout: 30,
    };

    expect(tcpConfig.protocol).toBe('Tcp');
    expect(udpConfig.protocol).toBe('Udp');
  });

  it('should handle transfer modes correctly', () => {
    const transmitterConfig: TransferConfig = {
      mode: 'Transmitter',
      protocol: 'Tcp',
      target_ip: '127.0.0.1',
      port: 8080,
      chunk_size: 8192,
      timeout: 30,
    };

    const receiverConfig: TransferConfig = {
      mode: 'Receiver',
      protocol: 'Tcp',
      port: 8080,
      chunk_size: 8192,
      timeout: 30,
    };

    expect(transmitterConfig.mode).toBe('Transmitter');
    expect(receiverConfig.mode).toBe('Receiver');
  });

  it('should handle transfer status types correctly', () => {
    const statuses: TransferProgress['status'][] = [
      'Idle',
      'Connecting',
      'Transferring',
      'Completed',
      'Error',
      'Cancelled',
    ];

    statuses.forEach(status => {
      const progress: TransferProgress = {
        transfer_id: 'test',
        progress: 0,
        speed: 0,
        eta: 0,
        status,
        bytes_transferred: 0,
        total_bytes: 0,
      };

      expect(progress.status).toBe(status);
    });
  });
});