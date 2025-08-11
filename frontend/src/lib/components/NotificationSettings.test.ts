import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import NotificationSettings from './NotificationSettings.svelte';

// Mock the system notifications service
vi.mock('../services/system-notifications', () => ({
  systemNotifications: {
    supported: true,
    permission: 'granted' as const,
    requestPermission: vi.fn(),
    show: vi.fn(),
    onFallback: vi.fn(() => () => {})
  },
  notificationSettings: {
    subscribe: vi.fn(),
    updateSetting: vi.fn(),
    reset: vi.fn(),
    export: vi.fn(),
    import: vi.fn()
  }
}));

// Mock file operations
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
  }
});

describe('NotificationSettings Component', () => {
  const defaultSettings = {
    enabled: true,
    soundEnabled: true,
    showOnTransferComplete: true,
    showOnTransferError: true,
    showOnConnectionStatus: false,
    fallbackToInApp: true,
    autoFocusOnClick: true
  };

  let mockSystemNotifications: any;
  let mockNotificationSettings: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked services
    const services = await import('../services/system-notifications');
    mockSystemNotifications = services.systemNotifications as any;
    mockNotificationSettings = services.notificationSettings as any;
    
    // Mock the settings store subscription
    mockNotificationSettings.subscribe.mockImplementation((callback: any) => {
      callback(defaultSettings);
      return () => {}; // unsubscribe function
    });
    
    mockNotificationSettings.export.mockReturnValue(defaultSettings);
  });

  it('should render notification settings', () => {
    render(NotificationSettings);
    
    expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure how and when you receive notifications about file transfers.')).toBeInTheDocument();
  });

  it('should show system notification status', () => {
    render(NotificationSettings);
    
    expect(screen.getByText('System notifications enabled')).toBeInTheDocument();
  });

  it('should show permission request button when needed', () => {
    mockSystemNotifications.permission = 'default';
    
    render(NotificationSettings);
    
    expect(screen.getByTestId('request-permission-btn')).toBeInTheDocument();
    expect(screen.getByText('Enable')).toBeInTheDocument();
  });

  it('should show test notification button when permission granted', () => {
    mockSystemNotifications.permission = 'granted';
    
    render(NotificationSettings);
    
    expect(screen.getByTestId('test-notification-btn')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle permission request', async () => {
    mockSystemNotifications.permission = 'default';
    mockSystemNotifications.requestPermission.mockResolvedValue('granted');
    
    render(NotificationSettings);
    
    const requestButton = screen.getByTestId('request-permission-btn');
    await fireEvent.click(requestButton);
    
    expect(mockSystemNotifications.requestPermission).toHaveBeenCalled();
  });

  it('should handle test notification', async () => {
    mockSystemNotifications.permission = 'granted';
    mockSystemNotifications.show.mockResolvedValue('notification-id');
    
    render(NotificationSettings);
    
    const testButton = screen.getByTestId('test-notification-btn');
    await fireEvent.click(testButton);
    
    expect(mockSystemNotifications.show).toHaveBeenCalledWith({
      title: 'Test Notification',
      body: 'This is a test notification from File Transfer App',
      icon: 'info',
      sound: 'default'
    });
  });

  it('should toggle notification settings', async () => {
    render(NotificationSettings);
    
    const enabledToggle = screen.getByTestId('notifications-enabled');
    await fireEvent.click(enabledToggle);
    
    expect(mockNotificationSettings.updateSetting).toHaveBeenCalledWith('enabled', expect.any(Boolean));
  });

  it('should toggle sound settings', async () => {
    render(NotificationSettings);
    
    const soundToggle = screen.getByTestId('sound-enabled');
    await fireEvent.click(soundToggle);
    
    expect(mockNotificationSettings.updateSetting).toHaveBeenCalledWith('soundEnabled', expect.any(Boolean));
  });

  it('should toggle transfer complete notifications', async () => {
    render(NotificationSettings);
    
    const transferCompleteToggle = screen.getByTestId('transfer-complete');
    await fireEvent.click(transferCompleteToggle);
    
    expect(mockNotificationSettings.updateSetting).toHaveBeenCalledWith('showOnTransferComplete', expect.any(Boolean));
  });

  it('should toggle transfer error notifications', async () => {
    render(NotificationSettings);
    
    const transferErrorToggle = screen.getByTestId('transfer-error');
    await fireEvent.click(transferErrorToggle);
    
    expect(mockNotificationSettings.updateSetting).toHaveBeenCalledWith('showOnTransferError', expect.any(Boolean));
  });

  it('should toggle connection status notifications', async () => {
    render(NotificationSettings);
    
    const connectionStatusToggle = screen.getByTestId('connection-status');
    await fireEvent.click(connectionStatusToggle);
    
    expect(mockNotificationSettings.updateSetting).toHaveBeenCalledWith('showOnConnectionStatus', expect.any(Boolean));
  });

  it('should show/hide advanced settings', async () => {
    render(NotificationSettings);
    
    const toggleAdvancedButton = screen.getByTestId('toggle-advanced');
    expect(screen.getByText('Show Advanced')).toBeInTheDocument();
    
    await fireEvent.click(toggleAdvancedButton);
    
    expect(screen.getByText('Hide Advanced')).toBeInTheDocument();
    expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
  });

  it('should handle advanced settings toggles', async () => {
    render(NotificationSettings, { showAdvanced: true });
    
    const fallbackToggle = screen.getByTestId('fallback-in-app');
    await fireEvent.click(fallbackToggle);
    
    expect(mockNotificationSettings.updateSetting).toHaveBeenCalledWith('fallbackToInApp', expect.any(Boolean));
    
    const autoFocusToggle = screen.getByTestId('auto-focus');
    await fireEvent.click(autoFocusToggle);
    
    expect(mockNotificationSettings.updateSetting).toHaveBeenCalledWith('autoFocusOnClick', expect.any(Boolean));
  });

  it('should export settings', async () => {
    render(NotificationSettings);
    
    // Mock document.createElement and click
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn()
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    
    const exportButton = screen.getByTestId('export-settings');
    await fireEvent.click(exportButton);
    
    expect(mockNotificationSettings.export).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('notification-settings.json');
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it('should handle import settings', async () => {
    render(NotificationSettings);
    
    // Mock file input
    const mockInput = {
      type: 'file',
      accept: '.json',
      onchange: null as any,
      click: vi.fn()
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockInput as any);
    
    const importButton = screen.getByTestId('import-settings');
    await fireEvent.click(importButton);
    
    expect(mockInput.type).toBe('file');
    expect(mockInput.accept).toBe('.json');
    expect(mockInput.click).toHaveBeenCalled();
    
    // Simulate file selection
    const mockFile = new File(['{"enabled": false}'], 'settings.json', { type: 'application/json' });
    mockFile.text = vi.fn().mockResolvedValue('{"enabled": false}');
    
    const mockEvent = {
      target: { files: [mockFile] }
    };
    
    if (mockInput.onchange) {
      await mockInput.onchange(mockEvent);
      expect(mockNotificationSettings.import).toHaveBeenCalledWith({ enabled: false });
    }
  });

  it('should handle invalid import file', async () => {
    render(NotificationSettings);
    
    // Mock alert
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    const mockInput = {
      type: 'file',
      accept: '.json',
      onchange: null as any,
      click: vi.fn()
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockInput as any);
    
    const importButton = screen.getByTestId('import-settings');
    await fireEvent.click(importButton);
    
    // Simulate invalid file
    const mockFile = new File(['invalid json'], 'settings.json', { type: 'application/json' });
    mockFile.text = vi.fn().mockResolvedValue('invalid json');
    
    const mockEvent = {
      target: { files: [mockFile] }
    };
    
    if (mockInput.onchange) {
      await mockInput.onchange(mockEvent);
      expect(window.alert).toHaveBeenCalledWith('Failed to import settings: Invalid file format');
    }
  });

  it('should reset settings with confirmation', async () => {
    render(NotificationSettings);
    
    // Mock confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    const resetButton = screen.getByTestId('reset-settings');
    await fireEvent.click(resetButton);
    
    expect(window.confirm).toHaveBeenCalledWith('Reset all notification settings to defaults?');
    expect(mockNotificationSettings.reset).toHaveBeenCalled();
  });

  it('should not reset settings without confirmation', async () => {
    render(NotificationSettings);
    
    // Mock confirm to return false
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    const resetButton = screen.getByTestId('reset-settings');
    await fireEvent.click(resetButton);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(mockNotificationSettings.reset).not.toHaveBeenCalled();
  });

  it('should disable controls when notifications are disabled', () => {
    const disabledSettings = { ...defaultSettings, enabled: false };
    mockNotificationSettings.subscribe.mockImplementation((callback) => {
      callback(disabledSettings);
      return () => {};
    });
    
    render(NotificationSettings);
    
    const soundToggle = screen.getByTestId('sound-enabled');
    const transferCompleteToggle = screen.getByTestId('transfer-complete');
    const transferErrorToggle = screen.getByTestId('transfer-error');
    const connectionStatusToggle = screen.getByTestId('connection-status');
    
    expect(soundToggle).toBeDisabled();
    expect(transferCompleteToggle).toBeDisabled();
    expect(transferErrorToggle).toBeDisabled();
    expect(connectionStatusToggle).toBeDisabled();
  });

  it('should show unsupported message when system notifications not supported', () => {
    mockSystemNotifications.supported = false;
    
    render(NotificationSettings);
    
    expect(screen.getByText('System notifications not supported')).toBeInTheDocument();
  });

  it('should show blocked message when permission denied', () => {
    mockSystemNotifications.permission = 'denied';
    
    render(NotificationSettings);
    
    expect(screen.getByText('System notifications blocked')).toBeInTheDocument();
  });
});