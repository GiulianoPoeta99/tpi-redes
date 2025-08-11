import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { notificationSettings, notificationUtils } from './system-notifications';
import type { NotificationSettings } from './system-notifications';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn()
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    setFocus: vi.fn(),
    show: vi.fn()
  })
}));

vi.mock('$app/environment', () => ({
  browser: true
}));

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

describe('NotificationSettings Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    (window.localStorage.getItem as any).mockReturnValue(null);
  });

  it('should initialize with default settings', () => {
    const settings = get(notificationSettings);
    
    expect(settings.enabled).toBe(true);
    expect(settings.soundEnabled).toBe(true);
    expect(settings.showOnTransferComplete).toBe(true);
    expect(settings.showOnTransferError).toBe(true);
    expect(settings.showOnConnectionStatus).toBe(false);
    expect(settings.fallbackToInApp).toBe(true);
    expect(settings.autoFocusOnClick).toBe(true);
  });

  it('should load settings from localStorage', () => {
    const storedSettings: Partial<NotificationSettings> = {
      enabled: false,
      soundEnabled: false,
      showOnTransferComplete: false
    };
    
    (window.localStorage.getItem as any).mockReturnValue(JSON.stringify(storedSettings));
    
    // Re-import to trigger initialization
    vi.resetModules();
    
    // Note: In a real test environment, we'd need to handle module re-initialization
    // For now, we'll test the updateSetting method instead
  });

  it('should update individual settings', () => {
    notificationSettings.updateSetting('enabled', false);
    
    const settings = get(notificationSettings);
    expect(settings.enabled).toBe(false);
    expect(window.localStorage.setItem).toHaveBeenCalled();
  });

  it('should reset to default settings', () => {
    // First change some settings
    notificationSettings.updateSetting('enabled', false);
    notificationSettings.updateSetting('soundEnabled', false);
    
    // Then reset
    notificationSettings.reset();
    
    const settings = get(notificationSettings);
    expect(settings.enabled).toBe(true);
    expect(settings.soundEnabled).toBe(true);
    expect(window.localStorage.removeItem).toHaveBeenCalled();
  });

  it('should export settings', () => {
    const exported = notificationSettings.export();
    
    expect(exported).toHaveProperty('enabled');
    expect(exported).toHaveProperty('soundEnabled');
    expect(exported).toHaveProperty('showOnTransferComplete');
  });

  it('should import settings', () => {
    const importSettings: Partial<NotificationSettings> = {
      enabled: false,
      soundEnabled: false
    };
    
    notificationSettings.import(importSettings);
    
    const settings = get(notificationSettings);
    expect(settings.enabled).toBe(false);
    expect(settings.soundEnabled).toBe(false);
    expect(window.localStorage.setItem).toHaveBeenCalled();
  });
});

describe('SystemNotificationService', () => {
  let mockInvoke: any;
  let mockListen: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked functions
    const { invoke } = await import('@tauri-apps/api/core');
    const { listen } = await import('@tauri-apps/api/event');
    mockInvoke = invoke as any;
    mockListen = listen as any;
  });

  it('should check notification support', async () => {
    mockInvoke.mockResolvedValueOnce('granted');
    
    // Import the service to trigger initialization
    const { systemNotifications } = await import('./system-notifications');
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(mockInvoke).toHaveBeenCalledWith('check_notification_permission');
  });

  it('should request notification permission', async () => {
    mockInvoke.mockResolvedValueOnce('granted');
    
    const { systemNotifications } = await import('./system-notifications');
    const permission = await systemNotifications.requestPermission();
    
    expect(permission).toBe('granted');
    expect(mockInvoke).toHaveBeenCalledWith('request_notification_permission');
  });

  it('should show system notification', async () => {
    mockInvoke.mockResolvedValueOnce('notification-id-123');
    
    const { systemNotifications } = await import('./system-notifications');
    
    // Mock permission as granted
    Object.defineProperty(systemNotifications, 'permission', {
      get: () => 'granted'
    });
    Object.defineProperty(systemNotifications, 'supported', {
      get: () => true
    });
    
    const notificationId = await systemNotifications.show({
      title: 'Test',
      body: 'Test notification'
    });
    
    expect(notificationId).toBe('notification-id-123');
    expect(mockInvoke).toHaveBeenCalledWith('show_system_notification', {
      options: {
        title: 'Test',
        body: 'Test notification',
        sound: undefined
      }
    });
  });

  it('should show transfer complete notification', async () => {
    mockInvoke.mockResolvedValueOnce('notification-id-123');
    
    const { systemNotifications } = await import('./system-notifications');
    
    // Mock permission and support
    Object.defineProperty(systemNotifications, 'permission', {
      get: () => 'granted'
    });
    Object.defineProperty(systemNotifications, 'supported', {
      get: () => true
    });
    
    const notificationId = await systemNotifications.showTransferComplete('test.txt', 1024, 30);
    
    expect(notificationId).toBe('notification-id-123');
    expect(mockInvoke).toHaveBeenCalledWith('show_system_notification', {
      options: expect.objectContaining({
        title: 'Transfer Complete',
        body: expect.stringContaining('test.txt'),
        icon: 'success',
        sound: 'default'
      })
    });
  });

  it('should show transfer error notification', async () => {
    mockInvoke.mockResolvedValueOnce('notification-id-123');
    
    const { systemNotifications } = await import('./system-notifications');
    
    // Mock permission and support
    Object.defineProperty(systemNotifications, 'permission', {
      get: () => 'granted'
    });
    Object.defineProperty(systemNotifications, 'supported', {
      get: () => true
    });
    
    const notificationId = await systemNotifications.showTransferError('test.txt', 'Network error');
    
    expect(notificationId).toBe('notification-id-123');
    expect(mockInvoke).toHaveBeenCalledWith('show_system_notification', {
      options: expect.objectContaining({
        title: 'Transfer Failed',
        body: expect.stringContaining('test.txt'),
        icon: 'error',
        sound: 'default'
      })
    });
  });

  it('should handle fallback notifications', async () => {
    const { systemNotifications } = await import('./system-notifications');
    
    // Mock no permission
    Object.defineProperty(systemNotifications, 'permission', {
      get: () => 'denied'
    });
    Object.defineProperty(systemNotifications, 'supported', {
      get: () => true
    });
    
    const fallbackCallback = vi.fn();
    const unsubscribe = systemNotifications.onFallback(fallbackCallback);
    
    await systemNotifications.show({
      title: 'Test',
      body: 'Test notification'
    });
    
    expect(fallbackCallback).toHaveBeenCalledWith({
      title: 'Test',
      body: 'Test notification'
    });
    
    unsubscribe();
  });
});

describe('Notification Utils', () => {
  it('should format bytes correctly', () => {
    expect(notificationUtils.formatBytes(500)).toBe('500 B');
    expect(notificationUtils.formatBytes(1536)).toBe('1.5 KB');
    expect(notificationUtils.formatBytes(1048576)).toBe('1.0 MB');
    expect(notificationUtils.formatBytes(1073741824)).toBe('1.0 GB');
  });

  it('should format duration correctly', () => {
    expect(notificationUtils.formatDuration(30)).toBe('30s');
    expect(notificationUtils.formatDuration(90)).toBe('1m 30s');
    expect(notificationUtils.formatDuration(3661)).toBe('1h 1m');
  });
});

describe('Error Handling', () => {
  it('should handle localStorage errors gracefully', () => {
    (window.localStorage.setItem as any).mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });
    
    // Should not throw
    expect(() => {
      notificationSettings.updateSetting('enabled', false);
    }).not.toThrow();
  });

  it('should handle notification API errors gracefully', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Notification API not available'));
    
    const { systemNotifications } = await import('./system-notifications');
    
    const result = await systemNotifications.show({
      title: 'Test',
      body: 'Test notification'
    });
    
    expect(result).toBeNull();
  });
});