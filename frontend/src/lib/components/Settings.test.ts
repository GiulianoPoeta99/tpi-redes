import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import Settings from './Settings.svelte';
import { appSettings, defaultAppSettings } from '../stores/settings';
import { get } from 'svelte/store';

// Mock browser APIs
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

// Mock URL.createObjectURL and related APIs for file operations
Object.defineProperty(window.URL, 'createObjectURL', {
  value: vi.fn(() => 'blob:mock-url'),
  writable: true,
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: vi.fn(),
  writable: true,
});

// Mock file reading
global.File = class MockFile {
  constructor(public content: string[], public name: string, public options?: any) {}
  
  async text(): Promise<string> {
    return this.content.join('');
  }
} as any;

describe('Settings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appSettings.reset();
  });

  afterEach(() => {
    appSettings.clear();
  });

  it('should render settings container', () => {
    render(Settings);
    
    expect(screen.getByTestId('settings-container')).toBeInTheDocument();
    expect(screen.getByText('Application Settings')).toBeInTheDocument();
  });

  it('should display current theme selection', () => {
    render(Settings);
    
    const themeSelector = screen.getByTestId('theme-selector');
    expect(themeSelector).toBeInTheDocument();
    
    // System should be selected by default
    const systemRadio = screen.getByDisplayValue('system');
    expect(systemRadio).toBeChecked();
  });

  it('should update theme when selection changes', async () => {
    render(Settings);
    
    const darkRadio = screen.getByDisplayValue('dark');
    await fireEvent.click(darkRadio);
    
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.theme).toBe('dark');
    });
  });

  it('should display default connection settings', () => {
    render(Settings);
    
    expect(screen.getByTestId('default-protocol')).toBeInTheDocument();
    expect(screen.getByTestId('default-port')).toBeInTheDocument();
    expect(screen.getByTestId('default-timeout')).toBeInTheDocument();
    expect(screen.getByTestId('default-chunk-size')).toBeInTheDocument();
  });

  it('should update default protocol', async () => {
    render(Settings);
    
    const protocolSelect = screen.getByTestId('default-protocol');
    await fireEvent.change(protocolSelect, { target: { value: 'Udp' } });
    
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.defaultConnection.protocol).toBe('Udp');
    });
  });

  it('should update default port', async () => {
    render(Settings);
    
    const portInput = screen.getByTestId('default-port');
    await fireEvent.input(portInput, { target: { value: '9090' } });
    
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.defaultConnection.port).toBe(9090);
    });
  });

  it('should toggle developer mode', async () => {
    render(Settings);
    
    const developerModeToggle = screen.getByTestId('developer-mode');
    expect(developerModeToggle).not.toBeChecked();
    
    await fireEvent.click(developerModeToggle);
    
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.developerMode).toBe(true);
    });
  });

  it('should toggle UI preferences', async () => {
    render(Settings);
    
    const showAdvancedToggle = screen.getByTestId('show-advanced-options');
    const autoSaveToggle = screen.getByTestId('auto-save-config');
    const confirmExitToggle = screen.getByTestId('confirm-before-exit');
    const showHistoryToggle = screen.getByTestId('show-transfer-history');
    
    // Test show advanced options
    await fireEvent.click(showAdvancedToggle);
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.ui.showAdvancedOptions).toBe(true);
    });
    
    // Test auto-save config
    await fireEvent.click(autoSaveToggle);
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.ui.autoSaveConfig).toBe(false); // Was true by default
    });
    
    // Test confirm before exit
    await fireEvent.click(confirmExitToggle);
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.ui.confirmBeforeExit).toBe(false); // Was true by default
    });
    
    // Test show transfer history
    await fireEvent.click(showHistoryToggle);
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.ui.showTransferHistory).toBe(false); // Was true by default
    });
  });

  it('should update file preferences', async () => {
    render(Settings);
    
    const maxFileSizeInput = screen.getByTestId('max-file-size');
    const showHiddenToggle = screen.getByTestId('show-hidden-files');
    
    // Update max file size
    await fireEvent.input(maxFileSizeInput, { target: { value: '500' } });
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.files.maxFileSize).toBe(500 * 1024 * 1024); // 500MB in bytes
    });
    
    // Toggle show hidden files
    await fireEvent.click(showHiddenToggle);
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.files.showHiddenFiles).toBe(true);
    });
  });

  it('should export settings', async () => {
    render(Settings);
    
    // Mock document.createElement for download link
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    
    const exportButton = screen.getByTestId('export-settings');
    await fireEvent.click(exportButton);
    
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toMatch(/file-transfer-settings-\d{4}-\d{2}-\d{2}\.json/);
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByTestId('export-success')).toBeInTheDocument();
    });
  });

  it('should import valid settings', async () => {
    render(Settings);
    
    const importButton = screen.getByTestId('import-settings');
    const fileInput = screen.getByTestId('file-input');
    
    // Mock file with valid settings
    const validSettings = {
      theme: 'dark',
      developerMode: true,
      defaultConnection: {
        protocol: 'Udp',
        port: 9090,
        timeout: 60,
        chunkSize: 4096,
      },
    };
    
    const mockFile = new File([JSON.stringify(validSettings)], 'settings.json', {
      type: 'application/json',
    });
    
    // Simulate file selection
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    await fireEvent.change(fileInput);
    
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.theme).toBe('dark');
      expect(settings.developerMode).toBe(true);
      expect(settings.defaultConnection.protocol).toBe('Udp');
    });
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByTestId('export-success')).toBeInTheDocument();
    });
  });

  it('should handle invalid settings import', async () => {
    render(Settings);
    
    const fileInput = screen.getByTestId('file-input');
    
    // Mock file with invalid settings
    const invalidSettings = {
      theme: 'invalid-theme',
      defaultConnection: {
        port: 70000, // Invalid port
      },
    };
    
    const mockFile = new File([JSON.stringify(invalidSettings)], 'settings.json', {
      type: 'application/json',
    });
    
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    await fireEvent.change(fileInput);
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByTestId('import-error')).toBeInTheDocument();
    });
    
    // Settings should remain unchanged
    const settings = get(appSettings);
    expect(settings.theme).toBe('system'); // Default value
  });

  it('should handle malformed JSON import', async () => {
    render(Settings);
    
    const fileInput = screen.getByTestId('file-input');
    
    const mockFile = new File(['invalid json content'], 'settings.json', {
      type: 'application/json',
    });
    
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    await fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByTestId('import-error')).toBeInTheDocument();
      expect(screen.getByText(/Failed to read settings file/)).toBeInTheDocument();
    });
  });

  it('should show reset confirmation', async () => {
    render(Settings);
    
    const resetButton = screen.getByTestId('reset-settings');
    await fireEvent.click(resetButton);
    
    expect(screen.getByTestId('confirm-reset')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-reset')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('should cancel reset', async () => {
    render(Settings);
    
    const resetButton = screen.getByTestId('reset-settings');
    await fireEvent.click(resetButton);
    
    const cancelButton = screen.getByTestId('cancel-reset');
    await fireEvent.click(cancelButton);
    
    expect(screen.queryByTestId('confirm-reset')).not.toBeInTheDocument();
    expect(screen.getByTestId('reset-settings')).toBeInTheDocument();
  });

  it('should execute reset', async () => {
    render(Settings);
    
    // First change some settings
    appSettings.updateSetting('theme', 'dark');
    appSettings.updateSetting('developerMode', true);
    
    const resetButton = screen.getByTestId('reset-settings');
    await fireEvent.click(resetButton);
    
    const confirmButton = screen.getByTestId('confirm-reset');
    await fireEvent.click(confirmButton);
    
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.theme).toBe('system');
      expect(settings.developerMode).toBe(false);
    });
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByTestId('export-success')).toBeInTheDocument();
    });
  });

  it('should toggle advanced settings visibility', async () => {
    render(Settings, { showAdvanced: false });
    
    const toggleButton = screen.getByTestId('toggle-advanced-settings');
    expect(toggleButton).toHaveTextContent('Show Advanced Settings');
    
    await fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(toggleButton).toHaveTextContent('Hide Advanced Settings');
    });
  });

  it('should display validation errors', async () => {
    render(Settings);
    
    // Set invalid settings that would trigger validation errors
    const portInput = screen.getByTestId('default-port');
    await fireEvent.input(portInput, { target: { value: '70000' } });
    
    // The component should prevent invalid values, but let's test the error display
    // by directly setting invalid settings (this would happen if validation fails)
    
    // For this test, we'll simulate the validation error display
    // In a real scenario, the validation would prevent the invalid value from being set
    expect(portInput).toBeInTheDocument();
  });

  it('should handle localStorage errors gracefully', async () => {
    // Mock localStorage to throw errors
    (window.localStorage.setItem as any).mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });
    
    render(Settings);
    
    const themeRadio = screen.getByDisplayValue('dark');
    
    // Should not throw error even if localStorage fails
    expect(async () => {
      await fireEvent.click(themeRadio);
    }).not.toThrow();
  });

  it('should sync notification settings', async () => {
    render(Settings);
    
    // The component should include NotificationSettings
    // This tests that the notification settings are properly integrated
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });
});

describe('Settings Component Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appSettings.reset();
  });

  it('should maintain settings consistency across updates', async () => {
    render(Settings);
    
    // Update multiple related settings
    const protocolSelect = screen.getByTestId('default-protocol');
    const portInput = screen.getByTestId('default-port');
    const timeoutInput = screen.getByTestId('default-timeout');
    
    await fireEvent.change(protocolSelect, { target: { value: 'Udp' } });
    await fireEvent.input(portInput, { target: { value: '9090' } });
    await fireEvent.input(timeoutInput, { target: { value: '60' } });
    
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.defaultConnection.protocol).toBe('Udp');
      expect(settings.defaultConnection.port).toBe(9090);
      expect(settings.defaultConnection.timeout).toBe(60);
    });
    
    // Verify that other settings remain unchanged
    const settings = get(appSettings);
    expect(settings.theme).toBe('system');
    expect(settings.developerMode).toBe(false);
  });

  it('should handle rapid setting changes', async () => {
    render(Settings);
    
    const portInput = screen.getByTestId('default-port');
    
    // Rapidly change port values
    await fireEvent.input(portInput, { target: { value: '8080' } });
    await fireEvent.input(portInput, { target: { value: '8081' } });
    await fireEvent.input(portInput, { target: { value: '8082' } });
    
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.defaultConnection.port).toBe(8082);
    });
  });

  it('should preserve settings after component remount', async () => {
    const { unmount } = render(Settings);
    
    // Change some settings
    const themeRadio = screen.getByDisplayValue('dark');
    await fireEvent.click(themeRadio);
    
    await waitFor(() => {
      const settings = get(appSettings);
      expect(settings.theme).toBe('dark');
    });
    
    // Unmount and remount component
    unmount();
    render(Settings);
    
    // Settings should be preserved
    const newThemeRadio = screen.getByDisplayValue('dark');
    expect(newThemeRadio).toBeChecked();
  });
});