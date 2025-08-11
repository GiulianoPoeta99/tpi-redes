// System notification service using Tauri notification API
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface SystemNotificationOptions {
  title: string;
  body: string;
  icon?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  showOnTransferComplete: boolean;
  showOnTransferError: boolean;
  showOnConnectionStatus: boolean;
  fallbackToInApp: boolean;
  autoFocusOnClick: boolean;
}

export type NotificationPermission = 'granted' | 'denied' | 'default' | 'unknown';

// Default notification settings
const defaultSettings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  showOnTransferComplete: true,
  showOnTransferError: true,
  showOnConnectionStatus: false,
  fallbackToInApp: true,
  autoFocusOnClick: true,
};

// Notification settings store
function createNotificationSettingsStore() {
  const storageKey = 'notification-settings';
  
  // Load settings from localStorage
  let initialSettings = defaultSettings;
  if (browser) {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        initialSettings = { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load notification settings:', error);
    }
  }

  const { subscribe, set, update } = writable<NotificationSettings>(initialSettings);

  return {
    subscribe,
    set,
    update,
    
    // Update specific setting
    updateSetting<K extends keyof NotificationSettings>(
      key: K, 
      value: NotificationSettings[K]
    ): void {
      update(settings => {
        const newSettings = { ...settings, [key]: value };
        
        // Save to localStorage
        if (browser) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(newSettings));
          } catch (error) {
            console.warn('Failed to save notification settings:', error);
          }
        }
        
        return newSettings;
      });
    },

    // Reset to defaults
    reset(): void {
      set(defaultSettings);
      if (browser) {
        try {
          localStorage.removeItem(storageKey);
        } catch (error) {
          console.warn('Failed to clear notification settings:', error);
        }
      }
    },

    // Export settings
    export(): NotificationSettings {
      return get(this);
    },

    // Import settings
    import(settings: Partial<NotificationSettings>): void {
      update(current => {
        const newSettings = { ...current, ...settings };
        
        if (browser) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(newSettings));
          } catch (error) {
            console.warn('Failed to save imported notification settings:', error);
          }
        }
        
        return newSettings;
      });
    }
  };
}

export const notificationSettings = createNotificationSettingsStore();

// System notification service
class SystemNotificationService {
  private permissionState: NotificationPermission = 'unknown';
  private isSupported = false;
  private fallbackCallbacks: Array<(options: SystemNotificationOptions) => void> = [];

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!browser) return;

    try {
      // Check if system notifications are supported
      this.isSupported = await this.checkSupport();
      
      // Check current permission state
      this.permissionState = await this.checkPermission();
      
      // Set up notification click handlers
      this.setupEventListeners();
    } catch (error) {
      console.warn('Failed to initialize system notifications:', error);
      this.isSupported = false;
    }
  }

  private async checkSupport(): Promise<boolean> {
    try {
      // Try to check permission - if this fails, notifications aren't supported
      await invoke('check_notification_permission');
      return true;
    } catch (error) {
      console.warn('System notifications not supported:', error);
      return false;
    }
  }

  private async checkPermission(): Promise<NotificationPermission> {
    try {
      const permission = await invoke<string>('check_notification_permission');
      return permission.toLowerCase() as NotificationPermission;
    } catch (error) {
      console.warn('Failed to check notification permission:', error);
      return 'unknown';
    }
  }

  private setupEventListeners(): void {
    if (!browser) return;

    // Listen for notification click events
    listen('notification-clicked', (event) => {
      const settings = get(notificationSettings);
      
      if (settings.autoFocusOnClick) {
        // Bring the app to foreground
        this.focusApp();
      }
      
      // Emit custom event for app to handle
      window.dispatchEvent(new CustomEvent('system-notification-clicked', {
        detail: event.payload
      }));
    });

    // Listen for notification action events
    listen('notification-action', (event) => {
      // Emit custom event for app to handle
      window.dispatchEvent(new CustomEvent('system-notification-action', {
        detail: event.payload
      }));
    });
  }

  private async focusApp(): Promise<void> {
    try {
      // Use Tauri's window API to focus the app
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const window = getCurrentWindow();
      await window.setFocus();
      await window.show();
    } catch (error) {
      console.warn('Failed to focus app window:', error);
    }
  }

  // Public API methods

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    try {
      const permission = await invoke<string>('request_notification_permission');
      this.permissionState = permission.toLowerCase() as NotificationPermission;
      return this.permissionState;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }

  async show(options: SystemNotificationOptions): Promise<string | null> {
    const settings = get(notificationSettings);
    
    if (!settings.enabled) {
      return null;
    }

    // Try system notification first
    if (this.isSupported && this.permissionState === 'granted') {
      try {
        const notificationId = await invoke<string>('show_system_notification', {
          options
        });
        
        return notificationId;
      } catch (error) {
        console.warn('Failed to show system notification:', error);
        
        // Fall back to in-app notification if enabled
        if (settings.fallbackToInApp) {
          this.showFallback(options);
        }
        
        return null;
      }
    }

    // Fall back to in-app notification
    if (settings.fallbackToInApp) {
      this.showFallback(options);
    }

    return null;
  }

  private showFallback(options: SystemNotificationOptions): void {
    // Trigger fallback callbacks (in-app notifications)
    this.fallbackCallbacks.forEach(callback => {
      try {
        callback(options);
      } catch (error) {
        console.warn('Fallback notification callback failed:', error);
      }
    });
  }

  // Register fallback callback for in-app notifications
  onFallback(callback: (options: SystemNotificationOptions) => void): () => void {
    this.fallbackCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.fallbackCallbacks.indexOf(callback);
      if (index > -1) {
        this.fallbackCallbacks.splice(index, 1);
      }
    };
  }

  // Convenience methods for common notification types
  async showTransferComplete(filename: string, size: number, duration: number): Promise<string | null> {
    const settings = get(notificationSettings);
    
    if (!settings.showOnTransferComplete) {
      return null;
    }

    const sizeStr = this.formatBytes(size);
    const durationStr = this.formatDuration(duration);
    
    return this.show({
      title: 'Transfer Complete',
      body: `Successfully transferred ${filename} (${sizeStr}) in ${durationStr}`,
      icon: 'success'
    });
  }

  async showTransferError(filename: string, error: string): Promise<string | null> {
    const settings = get(notificationSettings);
    
    if (!settings.showOnTransferError) {
      return null;
    }

    return this.show({
      title: 'Transfer Failed',
      body: `Failed to transfer ${filename}: ${error}`,
      icon: 'error'
    });
  }

  async showConnectionStatus(status: string, address: string, protocol: string): Promise<string | null> {
    const settings = get(notificationSettings);
    
    if (!settings.showOnConnectionStatus) {
      return null;
    }

    const messages = {
      connected: `Connected to ${address} via ${protocol}`,
      listening: `Listening on ${address} for ${protocol} connections`,
      disconnected: `Disconnected from ${address}`,
      connecting: `Connecting to ${address} via ${protocol}`
    };

    const body = messages[status as keyof typeof messages] || `${status}: ${address}`;
    
    return this.show({
      title: 'Connection Status',
      body,
      icon: 'info'
    });
  }

  // Utility methods
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  // Getters
  get supported(): boolean {
    return this.isSupported;
  }

  get permission(): NotificationPermission {
    return this.permissionState;
  }
}

// Export singleton instance
export const systemNotifications = new SystemNotificationService();

// Export utility functions for testing
export const notificationUtils = {
  formatBytes: (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  },
  
  formatDuration: (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};