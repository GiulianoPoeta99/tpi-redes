import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { configStore, isConfigValid, configsEqual, configPresets } from './config';
import type { TransferConfig } from '../types';
import { defaultTransferConfig } from '../types';

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

describe('configStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to default state
    configStore.reset();
  });

  it('initializes with default configuration', () => {
    const config = get(configStore);
    expect(config).toEqual(defaultTransferConfig);
  });

  it('loads configuration from localStorage', () => {
    const storedConfig: TransferConfig = {
      ...defaultTransferConfig,
      port: 9090,
      protocol: 'Udp'
    };
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedConfig));
    
    configStore.load();
    
    const config = get(configStore);
    expect(config.port).toBe(9090);
    expect(config.protocol).toBe('Udp');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('file-transfer-config');
  });

  it('falls back to defaults when localStorage is empty', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    configStore.load();
    
    const config = get(configStore);
    expect(config).toEqual(defaultTransferConfig);
  });

  it('falls back to defaults when localStorage contains invalid JSON', () => {
    localStorageMock.getItem.mockReturnValue('invalid-json');
    
    configStore.load();
    
    const config = get(configStore);
    expect(config).toEqual(defaultTransferConfig);
  });

  it('saves configuration to localStorage', () => {
    const newConfig: TransferConfig = {
      ...defaultTransferConfig,
      port: 9090,
      protocol: 'Udp'
    };
    
    configStore.save(newConfig);
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'file-transfer-config',
      JSON.stringify(newConfig)
    );
    
    const config = get(configStore);
    expect(config).toEqual(newConfig);
  });

  it('updates specific field and persists', () => {
    configStore.updateField('port', 9090);
    
    const config = get(configStore);
    expect(config.port).toBe(9090);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'file-transfer-config',
      expect.stringContaining('"port":9090')
    );
  });

  it('resets to default configuration', () => {
    // First modify the config
    configStore.updateField('port', 9090);
    
    // Then reset
    configStore.reset();
    
    const config = get(configStore);
    expect(config).toEqual(defaultTransferConfig);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'file-transfer-config',
      JSON.stringify(defaultTransferConfig)
    );
  });

  it('exports configuration as JSON string', () => {
    const testConfig: TransferConfig = {
      ...defaultTransferConfig,
      port: 9090
    };
    
    configStore.save(testConfig);
    
    const exported = configStore.export();
    const parsed = JSON.parse(exported);
    
    expect(parsed).toEqual(testConfig);
  });

  it('imports configuration from JSON string', () => {
    const testConfig: TransferConfig = {
      ...defaultTransferConfig,
      port: 9090,
      protocol: 'Udp'
    };
    
    const success = configStore.import(JSON.stringify(testConfig));
    
    expect(success).toBe(true);
    
    const config = get(configStore);
    expect(config.port).toBe(9090);
    expect(config.protocol).toBe('Udp');
  });

  it('handles invalid JSON during import', () => {
    const success = configStore.import('invalid-json');
    
    expect(success).toBe(false);
    
    // Config should remain unchanged
    const config = get(configStore);
    expect(config).toEqual(defaultTransferConfig);
  });

  it('clears stored configuration', () => {
    configStore.clear();
    
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('file-transfer-config');
    
    const config = get(configStore);
    expect(config).toEqual(defaultTransferConfig);
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });
    
    // Should not throw
    expect(() => {
      configStore.save(defaultTransferConfig);
    }).not.toThrow();
  });
});

describe('isConfigValid', () => {
  it('validates valid configuration', () => {
    const validConfig: TransferConfig = {
      ...defaultTransferConfig,
      mode: 'Transmitter',
      target_ip: '192.168.1.1',
      port: 8080
    };
    
    expect(isConfigValid(validConfig)).toBe(true);
  });

  it('invalidates configuration with invalid port', () => {
    const invalidConfig: TransferConfig = {
      ...defaultTransferConfig,
      port: 0
    };
    
    expect(isConfigValid(invalidConfig)).toBe(false);
  });

  it('invalidates transmitter configuration without target IP', () => {
    const invalidConfig: TransferConfig = {
      ...defaultTransferConfig,
      mode: 'Transmitter',
      target_ip: undefined
    };
    
    expect(isConfigValid(invalidConfig)).toBe(false);
  });

  it('validates receiver configuration without target IP', () => {
    const validConfig: TransferConfig = {
      ...defaultTransferConfig,
      mode: 'Receiver',
      target_ip: undefined
    };
    
    expect(isConfigValid(validConfig)).toBe(true);
  });
});

describe('configsEqual', () => {
  it('returns true for identical configurations', () => {
    const config1: TransferConfig = { ...defaultTransferConfig };
    const config2: TransferConfig = { ...defaultTransferConfig };
    
    expect(configsEqual(config1, config2)).toBe(true);
  });

  it('returns false for different configurations', () => {
    const config1: TransferConfig = { ...defaultTransferConfig };
    const config2: TransferConfig = { ...defaultTransferConfig, port: 9090 };
    
    expect(configsEqual(config1, config2)).toBe(false);
  });
});

describe('configPresets', () => {
  it('provides valid TCP local preset', () => {
    const preset = configPresets.tcpLocal;
    
    expect(preset.protocol).toBe('Tcp');
    expect(preset.target_ip).toBe('localhost');
    expect(preset.port).toBe(8080);
    expect(isConfigValid(preset)).toBe(true);
  });

  it('provides valid UDP local preset', () => {
    const preset = configPresets.udpLocal;
    
    expect(preset.protocol).toBe('Udp');
    expect(preset.target_ip).toBe('localhost');
    expect(preset.port).toBe(8080);
    expect(isConfigValid(preset)).toBe(true);
  });

  it('provides valid TCP network preset', () => {
    const preset = configPresets.tcpNetwork;
    
    expect(preset.protocol).toBe('Tcp');
    expect(preset.port).toBe(8080);
  });

  it('provides valid UDP network preset', () => {
    const preset = configPresets.udpNetwork;
    
    expect(preset.protocol).toBe('Udp');
    expect(preset.port).toBe(8080);
  });
});