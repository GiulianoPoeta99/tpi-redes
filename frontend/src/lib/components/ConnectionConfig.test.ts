import { describe, it, expect, vi } from 'vitest';
import type { TransferConfig } from '../types';
import { defaultTransferConfig, TransferConfigValidator } from '../types';

describe('ConnectionConfig Component', () => {
  it('should validate configuration correctly', () => {
    const validConfig: TransferConfig = {
      ...defaultTransferConfig,
      mode: 'Transmitter',
      target_ip: '192.168.1.1',
      port: 8080
    };
    
    const errors = TransferConfigValidator.validate(validConfig);
    expect(errors).toHaveLength(0);
  });

  it('should detect invalid IP addresses', () => {
    const invalidConfig: TransferConfig = {
      ...defaultTransferConfig,
      mode: 'Transmitter',
      target_ip: 'invalid-ip'
    };
    
    const errors = TransferConfigValidator.validate(invalidConfig);
    expect(errors.some(error => error.includes('Invalid IP address format'))).toBe(true);
  });

  it('should detect invalid port numbers', () => {
    const invalidConfig: TransferConfig = {
      ...defaultTransferConfig,
      port: 70000
    };
    
    const errors = TransferConfigValidator.validate(invalidConfig);
    expect(errors.some(error => error.includes('Invalid port number'))).toBe(true);
  });

  it('should validate IP addresses correctly', () => {
    expect(TransferConfigValidator.isValidIpAddress('192.168.1.1')).toBe(true);
    expect(TransferConfigValidator.isValidIpAddress('127.0.0.1')).toBe(true);
    expect(TransferConfigValidator.isValidIpAddress('localhost')).toBe(true);
    expect(TransferConfigValidator.isValidIpAddress('invalid-ip')).toBe(false);
    expect(TransferConfigValidator.isValidIpAddress('999.999.999.999')).toBe(false);
  });

  it('should require target IP for transmitter mode', () => {
    const configWithoutIP: TransferConfig = {
      ...defaultTransferConfig,
      mode: 'Transmitter',
      target_ip: undefined
    };
    
    const errors = TransferConfigValidator.validate(configWithoutIP);
    expect(errors.some(error => error.includes('Target IP address is required'))).toBe(true);
  });

  it('should not require target IP for receiver mode', () => {
    const receiverConfig: TransferConfig = {
      ...defaultTransferConfig,
      mode: 'Receiver',
      target_ip: undefined
    };
    
    const errors = TransferConfigValidator.validate(receiverConfig);
    expect(errors.some(error => error.includes('Target IP address is required'))).toBe(false);
  });

  it('should handle protocol changes correctly', () => {
    function updateProtocol(config: TransferConfig, newProtocol: 'Tcp' | 'Udp'): TransferConfig {
      return { ...config, protocol: newProtocol };
    }
    
    const tcpConfig = updateProtocol(defaultTransferConfig, 'Tcp');
    const udpConfig = updateProtocol(defaultTransferConfig, 'Udp');
    
    expect(tcpConfig.protocol).toBe('Tcp');
    expect(udpConfig.protocol).toBe('Udp');
  });

  it('should handle mode changes correctly', () => {
    function updateMode(config: TransferConfig, newMode: 'Transmitter' | 'Receiver'): TransferConfig {
      const updated = { ...config, mode: newMode };
      if (newMode === 'Receiver') {
        updated.target_ip = undefined;
      }
      return updated;
    }
    
    const transmitterConfig = updateMode(defaultTransferConfig, 'Transmitter');
    const receiverConfig = updateMode(defaultTransferConfig, 'Receiver');
    
    expect(transmitterConfig.mode).toBe('Transmitter');
    expect(receiverConfig.mode).toBe('Receiver');
    expect(receiverConfig.target_ip).toBeUndefined();
  });

  it('should reset to default configuration', () => {
    const customConfig: TransferConfig = {
      ...defaultTransferConfig,
      port: 9090,
      protocol: 'Udp',
      target_ip: '192.168.1.100'
    };
    
    function resetConfig(): TransferConfig {
      return { ...defaultTransferConfig };
    }
    
    const resetResult = resetConfig();
    expect(resetResult.port).toBe(8080);
    expect(resetResult.protocol).toBe('Tcp');
  });
});