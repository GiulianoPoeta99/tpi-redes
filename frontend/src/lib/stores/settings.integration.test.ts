import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { appSettings, defaultAppSettings } from './settings';

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

describe('Settings Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appSettings.reset();
  });

  it('should provide complete settings functionality', () => {
    // Test initial state
    const initialSettings = get(appSettings);
    expect(initialSettings.theme).toBe('system');
    expect(initialSettings.developerMode).toBe(false);
    
    // Test theme update
    appSettings.updateSetting('theme', 'dark');
    let settings = get(appSettings);
    expect(settings.theme).toBe('dark');
    
    // Test developer mode toggle
    appSettings.updateSetting('developerMode', true);
    settings = get(appSettings);
    expect(settings.developerMode).toBe(true);
    
    // Test nested setting update
    appSettings.updateNestedSetting('defaultConnection', 'port', 9090);
    settings = get(appSettings);
    expect(settings.defaultConnection.port).toBe(9090);
    
    // Test export/import cycle
    const exported = appSettings.export();
    expect(exported).toContain('"theme": "dark"');
    expect(exported).toContain('"developerMode": true');
    
    // Reset and import
    appSettings.reset();
    const importResult = appSettings.import(exported);
    expect(importResult.success).toBe(true);
    
    settings = get(appSettings);
    expect(settings.theme).toBe('dark');
    expect(settings.developerMode).toBe(true);
    expect(settings.defaultConnection.port).toBe(9090);
  });

  it('should handle theme application', () => {
    // Test system theme
    appSettings.updateSetting('theme', 'system');
    appSettings.applyTheme();
    expect(document.documentElement.classList.toggle).toHaveBeenCalled();
    
    // Test dark theme
    appSettings.updateSetting('theme', 'dark');
    appSettings.applyTheme();
    expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true);
    
    // Test light theme
    appSettings.updateSetting('theme', 'light');
    appSettings.applyTheme();
    expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', false);
  });

  it('should generate default transfer config', () => {
    // Update some connection defaults
    appSettings.updateNestedSetting('defaultConnection', 'protocol', 'Udp');
    appSettings.updateNestedSetting('defaultConnection', 'port', 9090);
    appSettings.updateNestedSetting('defaultConnection', 'timeout', 60);
    
    const transferConfig = appSettings.getDefaultTransferConfig();
    
    expect(transferConfig.protocol).toBe('Udp');
    expect(transferConfig.port).toBe(9090);
    expect(transferConfig.timeout).toBe(60);
    expect(transferConfig.mode).toBe('Transmitter'); // From defaultTransferConfig
  });

  it('should validate settings comprehensively', () => {
    // Test all setting categories
    const complexSettings = {
      ...defaultAppSettings,
      theme: 'light' as const,
      developerMode: true,
      defaultConnection: {
        protocol: 'Udp' as const,
        port: 8080,
        timeout: 30,
        chunkSize: 4096,
      },
      ui: {
        showAdvancedOptions: true,
        autoSaveConfig: false,
        confirmBeforeExit: false,
        showTransferHistory: true,
      },
      files: {
        defaultDownloadPath: '/home/user/downloads',
        maxFileSize: 500 * 1024 * 1024, // 500MB
        allowedFileTypes: ['.txt', '.pdf'],
        showHiddenFiles: true,
      },
      notifications: {
        enabled: false,
        soundEnabled: false,
        showOnTransferComplete: false,
        showOnTransferError: true,
        showOnConnectionStatus: true,
        fallbackToInApp: false,
        autoFocusOnClick: false,
      },
    };
    
    const result = appSettings.import(JSON.stringify(complexSettings));
    expect(result.success).toBe(true);
    
    const settings = get(appSettings);
    expect(settings.theme).toBe('light');
    expect(settings.developerMode).toBe(true);
    expect(settings.defaultConnection.protocol).toBe('Udp');
    expect(settings.ui.showAdvancedOptions).toBe(true);
    expect(settings.files.maxFileSize).toBe(500 * 1024 * 1024);
    expect(settings.notifications.enabled).toBe(false);
  });

  it('should handle edge cases gracefully', () => {
    // Test with minimal settings
    const minimalSettings = {
      theme: 'dark',
    };
    
    const result = appSettings.import(JSON.stringify(minimalSettings));
    expect(result.success).toBe(true);
    
    const settings = get(appSettings);
    expect(settings.theme).toBe('dark');
    // Other settings should remain at defaults
    expect(settings.defaultConnection.port).toBe(8080);
    expect(settings.developerMode).toBe(false);
  });
});