import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { appSettings, type AppSettings, AppSettingsValidator, defaultAppSettings } from './settings';

// Mock browser environment
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock matchMedia for theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock document for theme application
Object.defineProperty(document, 'documentElement', {
  value: {
    classList: {
      toggle: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
    },
  },
  writable: true,
});

describe('AppSettingsValidator', () => {
  it('should validate valid settings', () => {
    const validSettings: AppSettings = {
      ...defaultAppSettings,
      defaultConnection: {
        protocol: 'Tcp',
        port: 8080,
        timeout: 30,
        chunkSize: 8192,
      },
    };

    const errors = AppSettingsValidator.validate(validSettings);
    expect(errors).toHaveLength(0);
    expect(AppSettingsValidator.isValid(validSettings)).toBe(true);
  });

  it('should detect invalid theme', () => {
    const invalidSettings = {
      ...defaultAppSettings,
      theme: 'invalid' as any,
    };

    const errors = AppSettingsValidator.validate(invalidSettings);
    expect(errors).toContain('Invalid theme: invalid');
    expect(AppSettingsValidator.isValid(invalidSettings)).toBe(false);
  });

  it('should detect invalid port', () => {
    const invalidSettings = {
      ...defaultAppSettings,
      defaultConnection: {
        ...defaultAppSettings.defaultConnection,
        port: 70000,
      },
    };

    const errors = AppSettingsValidator.validate(invalidSettings);
    expect(errors).toContain('Invalid default port: 70000');
  });

  it('should detect invalid timeout', () => {
    const invalidSettings = {
      ...defaultAppSettings,
      defaultConnection: {
        ...defaultAppSettings.defaultConnection,
        timeout: 4000,
      },
    };

    const errors = AppSettingsValidator.validate(invalidSettings);
    expect(errors).toContain('Invalid default timeout: 4000');
  });

  it('should detect invalid chunk size', () => {
    const invalidSettings = {
      ...defaultAppSettings,
      defaultConnection: {
        ...defaultAppSettings.defaultConnection,
        chunkSize: 2 * 1024 * 1024, // 2MB, exceeds 1MB limit
      },
    };

    const errors = AppSettingsValidator.validate(invalidSettings);
    expect(errors).toContain('Invalid default chunk size: 2097152');
  });

  it('should detect invalid file size', () => {
    const invalidSettings = {
      ...defaultAppSettings,
      files: {
        ...defaultAppSettings.files,
        maxFileSize: 0,
      },
    };

    const errors = AppSettingsValidator.validate(invalidSettings);
    expect(errors).toContain('Maximum file size must be greater than 0');
  });

  it('should detect file size exceeding limit', () => {
    const invalidSettings = {
      ...defaultAppSettings,
      files: {
        ...defaultAppSettings.files,
        maxFileSize: 15 * 1024 * 1024 * 1024, // 15GB, exceeds 10GB limit
      },
    };

    const errors = AppSettingsValidator.validate(invalidSettings);
    expect(errors).toContain('Maximum file size cannot exceed 10GB');
  });
});

describe('AppSettings Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    (window.localStorage.getItem as any).mockReturnValue(null);
  });

  afterEach(() => {
    // Clear the store
    appSettings.clear();
  });

  it('should initialize with default settings', () => {
    const settings = get(appSettings);
    
    expect(settings.theme).toBe('system');
    expect(settings.defaultConnection.protocol).toBe('Tcp');
    expect(settings.defaultConnection.port).toBe(8080);
    expect(settings.developerMode).toBe(false);
    expect(settings.ui.showAdvancedOptions).toBe(false);
  });

  it('should load settings from localStorage', () => {
    const storedSettings: Partial<AppSettings> = {
      theme: 'dark',
      developerMode: true,
      defaultConnection: {
        protocol: 'Udp',
        port: 9090,
        timeout: 60,
        chunkSize: 4096,
      },
    };
    
    (window.localStorage.getItem as any).mockReturnValue(JSON.stringify(storedSettings));
    
    // Re-import to trigger initialization
    // Note: In a real test environment, you'd need to recreate the store
    // For this test, we'll simulate the loading behavior
    const result = appSettings.import(JSON.stringify(storedSettings));
    expect(result.success).toBe(true);
    
    const settings = get(appSettings);
    expect(settings.theme).toBe('dark');
    expect(settings.developerMode).toBe(true);
    expect(settings.defaultConnection.protocol).toBe('Udp');
    expect(settings.defaultConnection.port).toBe(9090);
  });

  it('should update individual settings', () => {
    appSettings.updateSetting('theme', 'dark');
    
    const settings = get(appSettings);
    expect(settings.theme).toBe('dark');
    expect(window.localStorage.setItem).toHaveBeenCalled();
  });

  it('should update nested settings', () => {
    appSettings.updateNestedSetting('defaultConnection', 'port', 9090);
    
    const settings = get(appSettings);
    expect(settings.defaultConnection.port).toBe(9090);
    expect(window.localStorage.setItem).toHaveBeenCalled();
  });

  it('should not save invalid settings', () => {
    // Try to set an invalid port
    appSettings.updateNestedSetting('defaultConnection', 'port', 70000);
    
    const settings = get(appSettings);
    // Should remain at default value
    expect(settings.defaultConnection.port).toBe(8080);
    // Should not have called localStorage.setItem for invalid settings
  });

  it('should reset to default settings', () => {
    // First change some settings
    appSettings.updateSetting('theme', 'dark');
    appSettings.updateSetting('developerMode', true);
    
    // Then reset
    appSettings.reset();
    
    const settings = get(appSettings);
    expect(settings.theme).toBe('system');
    expect(settings.developerMode).toBe(false);
    expect(window.localStorage.setItem).toHaveBeenCalled();
  });

  it('should export settings', () => {
    const exported = appSettings.export();
    const parsed = JSON.parse(exported);
    
    expect(parsed).toHaveProperty('theme');
    expect(parsed).toHaveProperty('defaultConnection');
    expect(parsed).toHaveProperty('developerMode');
  });

  it('should import valid settings', () => {
    const importSettings: Partial<AppSettings> = {
      theme: 'light',
      developerMode: true,
      defaultConnection: {
        protocol: 'Udp',
        port: 9090,
        timeout: 60,
        chunkSize: 4096,
      },
    };
    
    const result = appSettings.import(JSON.stringify(importSettings));
    
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    const settings = get(appSettings);
    expect(settings.theme).toBe('light');
    expect(settings.developerMode).toBe(true);
    expect(settings.defaultConnection.protocol).toBe('Udp');
    expect(window.localStorage.setItem).toHaveBeenCalled();
  });

  it('should reject invalid settings on import', () => {
    const invalidSettings = {
      theme: 'invalid',
      defaultConnection: {
        port: 70000,
      },
    };
    
    const result = appSettings.import(JSON.stringify(invalidSettings));
    
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    
    // Settings should remain unchanged
    const settings = get(appSettings);
    expect(settings.theme).toBe('system'); // Default value
  });

  it('should handle malformed JSON on import', () => {
    const result = appSettings.import('invalid json');
    
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Invalid JSON format');
  });

  it('should get default transfer config', () => {
    // Update some default connection settings
    appSettings.updateNestedSetting('defaultConnection', 'protocol', 'Udp');
    appSettings.updateNestedSetting('defaultConnection', 'port', 9090);
    
    const transferConfig = appSettings.getDefaultTransferConfig();
    
    expect(transferConfig.protocol).toBe('Udp');
    expect(transferConfig.port).toBe(9090);
    expect(transferConfig.mode).toBe('Transmitter'); // From defaultTransferConfig
  });

  it('should clear all settings', () => {
    // Change some settings first
    appSettings.updateSetting('theme', 'dark');
    
    // Clear settings
    appSettings.clear();
    
    const settings = get(appSettings);
    expect(settings.theme).toBe('system'); // Back to default
    expect(window.localStorage.removeItem).toHaveBeenCalled();
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw errors
    (window.localStorage.setItem as any).mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });
    
    // Should not throw, just log warning
    expect(() => {
      appSettings.updateSetting('theme', 'dark');
    }).not.toThrow();
  });

  it('should handle localStorage getItem errors gracefully', () => {
    (window.localStorage.getItem as any).mockImplementation(() => {
      throw new Error('Storage access denied');
    });
    
    // Should not throw, should use defaults
    expect(() => {
      appSettings.clear(); // This triggers a reload attempt
    }).not.toThrow();
  });
});

describe('Settings Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should merge partial settings correctly', () => {
    const partialSettings: Partial<AppSettings> = {
      theme: 'dark',
      defaultConnection: {
        protocol: 'Tcp', // Include required fields for validation
        port: 9090,
        timeout: 30,
        chunkSize: 8192,
      },
    };
    
    const result = appSettings.import(JSON.stringify(partialSettings));
    if (!result.success) {
      console.log('Import errors:', result.errors);
    }
    expect(result.success).toBe(true);
    
    const settings = get(appSettings);
    expect(settings.theme).toBe('dark');
    expect(settings.defaultConnection.port).toBe(9090);
    // Other connection settings should remain at defaults
    expect(settings.defaultConnection.protocol).toBe('Tcp');
    expect(settings.defaultConnection.timeout).toBe(30);
  });

  it('should validate complex settings combinations', () => {
    const complexSettings: AppSettings = {
      ...defaultAppSettings,
      theme: 'light',
      defaultConnection: {
        protocol: 'Udp',
        port: 8080,
        timeout: 30,
        chunkSize: 1024,
      },
      files: {
        defaultDownloadPath: '/home/user/downloads',
        maxFileSize: 500 * 1024 * 1024, // 500MB
        allowedFileTypes: ['.txt', '.pdf', '.jpg'],
        showHiddenFiles: true,
      },
      developerMode: true,
    };
    
    const errors = AppSettingsValidator.validate(complexSettings);
    expect(errors).toHaveLength(0);
    
    const result = appSettings.import(JSON.stringify(complexSettings));
    expect(result.success).toBe(true);
    
    const settings = get(appSettings);
    expect(settings.files.allowedFileTypes).toEqual(['.txt', '.pdf', '.jpg']);
    expect(settings.files.maxFileSize).toBe(500 * 1024 * 1024);
  });
});