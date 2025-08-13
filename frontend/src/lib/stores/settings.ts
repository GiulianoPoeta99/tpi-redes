// Application settings store with persistence
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { TransferConfig } from '../types';
import { defaultTransferConfig, TransferConfigValidator } from '../types';

export type Theme = 'light' | 'dark' | 'system';

export interface AppSettings {
  // Theme settings
  theme: Theme;
  
  // Default connection settings
  defaultConnection: {
    protocol: 'Tcp' | 'Udp';
    port: number;
    timeout: number;
    chunkSize: number;
  };
  
  // Notification preferences (references existing notification settings)
  notifications: {
    enabled: boolean;
    soundEnabled: boolean;
    showOnTransferComplete: boolean;
    showOnTransferError: boolean;
    showOnConnectionStatus: boolean;
    fallbackToInApp: boolean;
    autoFocusOnClick: boolean;
  };
  
  // Developer mode and advanced features
  developerMode: boolean;
  
  // UI preferences
  ui: {
    showAdvancedOptions: boolean;
    autoSaveConfig: boolean;
    confirmBeforeExit: boolean;
    showTransferHistory: boolean;
  };
  
  // File handling preferences
  files: {
    defaultDownloadPath?: string;
    maxFileSize: number; // in bytes
    allowedFileTypes: string[]; // empty array means all types allowed
    showHiddenFiles: boolean;
  };
}

// Default application settings
const defaultAppSettings: AppSettings = {
  theme: 'system',
  
  defaultConnection: {
    protocol: 'Tcp',
    port: 8080,
    timeout: 30,
    chunkSize: 8192,
  },
  
  notifications: {
    enabled: true,
    soundEnabled: true,
    showOnTransferComplete: true,
    showOnTransferError: true,
    showOnConnectionStatus: false,
    fallbackToInApp: true,
    autoFocusOnClick: true,
  },
  
  developerMode: false,
  
  ui: {
    showAdvancedOptions: false,
    autoSaveConfig: true,
    confirmBeforeExit: true,
    showTransferHistory: true,
  },
  
  files: {
    defaultDownloadPath: undefined,
    maxFileSize: 1024 * 1024 * 1024, // 1GB
    allowedFileTypes: [], // All types allowed by default
    showHiddenFiles: false,
  },
};

// Settings validation
export class AppSettingsValidator {
  static validate(settings: AppSettings): string[] {
    const errors: string[] = [];
    
    // Validate theme
    if (!['light', 'dark', 'system'].includes(settings.theme)) {
      errors.push(`Invalid theme: ${settings.theme}`);
    }
    
    // Validate default connection settings
    if (settings.defaultConnection.port <= 0 || settings.defaultConnection.port > 65535) {
      errors.push(`Invalid default port: ${settings.defaultConnection.port}`);
    }
    
    if (settings.defaultConnection.timeout <= 0 || settings.defaultConnection.timeout > 3600) {
      errors.push(`Invalid default timeout: ${settings.defaultConnection.timeout}`);
    }
    
    if (settings.defaultConnection.chunkSize <= 0 || settings.defaultConnection.chunkSize > 1024 * 1024) {
      errors.push(`Invalid default chunk size: ${settings.defaultConnection.chunkSize}`);
    }
    
    // Validate file settings
    if (settings.files.maxFileSize <= 0) {
      errors.push('Maximum file size must be greater than 0');
    }
    
    if (settings.files.maxFileSize > 10 * 1024 * 1024 * 1024) { // 10GB
      errors.push('Maximum file size cannot exceed 10GB');
    }
    
    return errors;
  }
  
  static isValid(settings: AppSettings): boolean {
    return this.validate(settings).length === 0;
  }
}

// Create settings store
function createAppSettingsStore() {
  const storageKey = 'app-settings';
  
  // Load settings from localStorage
  let initialSettings = defaultAppSettings;
  if (browser) {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedSettings = JSON.parse(stored) as Partial<AppSettings>;
        // Merge with defaults to handle missing fields
        initialSettings = mergeSettings(defaultAppSettings, parsedSettings);
      }
    } catch (error) {
      console.warn('Failed to load app settings:', error);
    }
  }

  const { subscribe, set, update } = writable<AppSettings>(initialSettings);

  return {
    subscribe,
    set,
    update,
    
    // Update specific setting
    updateSetting<K extends keyof AppSettings>(
      key: K, 
      value: AppSettings[K]
    ): void {
      update(settings => {
        const newSettings = { ...settings, [key]: value };
        
        // Validate settings before saving
        const errors = AppSettingsValidator.validate(newSettings);
        if (errors.length > 0) {
          console.warn('Settings validation errors:', errors);
          // Don't save invalid settings
          return settings;
        }
        
        // Save to localStorage
        if (browser) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(newSettings));
          } catch (error) {
            console.warn('Failed to save app settings:', error);
          }
        }
        
        return newSettings;
      });
    },

    // Update nested setting
    updateNestedSetting<K extends keyof AppSettings, NK extends keyof AppSettings[K]>(
      key: K,
      nestedKey: NK,
      value: AppSettings[K][NK]
    ): void {
      update(settings => {
        const newSettings = {
          ...settings,
          [key]: {
            ...settings[key],
            [nestedKey]: value
          }
        };
        
        // Validate settings before saving
        const errors = AppSettingsValidator.validate(newSettings);
        if (errors.length > 0) {
          console.warn('Settings validation errors:', errors);
          return settings;
        }
        
        // Save to localStorage
        if (browser) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(newSettings));
          } catch (error) {
            console.warn('Failed to save app settings:', error);
          }
        }
        
        return newSettings;
      });
    },

    // Reset to defaults
    reset(): void {
      const resetSettings = { ...defaultAppSettings };
      
      if (browser) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(resetSettings));
        } catch (error) {
          console.warn('Failed to save reset settings:', error);
        }
      }
      
      set(resetSettings);
    },

    // Export settings
    export(): string {
      const settings = get(this);
      return JSON.stringify(settings, null, 2);
    },

    // Import settings
    import(settingsJson: string): { success: boolean; errors: string[] } {
      try {
        const importedSettings = JSON.parse(settingsJson) as Partial<AppSettings>;
        const mergedSettings = mergeSettings(defaultAppSettings, importedSettings);
        
        // Validate imported settings
        const errors = AppSettingsValidator.validate(mergedSettings);
        if (errors.length > 0) {
          return { success: false, errors };
        }
        
        // Save valid settings (ignore localStorage errors in tests)
        if (browser) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(mergedSettings));
          } catch (error) {
            // In test environment or when localStorage fails, still proceed with setting the store
            console.warn('Failed to save imported settings to localStorage:', error);
          }
        }
        
        set(mergedSettings);
        return { success: true, errors: [] };
      } catch (error) {
        return { success: false, errors: ['Invalid JSON format'] };
      }
    },

    // Clear all settings
    clear(): void {
      if (browser) {
        try {
          localStorage.removeItem(storageKey);
        } catch (error) {
          console.warn('Failed to clear app settings:', error);
        }
      }
      set(defaultAppSettings);
    },

    // Get default transfer config based on settings
    getDefaultTransferConfig(): TransferConfig {
      const settings = get(this);
      return {
        ...defaultTransferConfig,
        protocol: settings.defaultConnection.protocol,
        port: settings.defaultConnection.port,
        timeout: settings.defaultConnection.timeout,
        chunk_size: settings.defaultConnection.chunkSize,
      };
    },

    // Apply theme to document
    applyTheme(): void {
      if (!browser) return;
      
      const settings = get(this);
      const root = document.documentElement;
      
      if (settings.theme === 'system') {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      } else {
        root.classList.toggle('dark', settings.theme === 'dark');
      }
    }
  };
}

// Helper function to merge settings objects
function mergeSettings(defaults: AppSettings, partial: Partial<AppSettings>): AppSettings {
  const merged = { ...defaults };
  
  // Merge top-level properties
  Object.keys(partial).forEach(key => {
    const typedKey = key as keyof AppSettings;
    const value = partial[typedKey];
    
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // For nested objects, ensure we have the right structure
        if (typedKey === 'defaultConnection' && typeof merged[typedKey] === 'object') {
          merged[typedKey] = { ...merged[typedKey], ...value } as any;
        } else if (typedKey === 'notifications' && typeof merged[typedKey] === 'object') {
          merged[typedKey] = { ...merged[typedKey], ...value } as any;
        } else if (typedKey === 'ui' && typeof merged[typedKey] === 'object') {
          merged[typedKey] = { ...merged[typedKey], ...value } as any;
        } else if (typedKey === 'files' && typeof merged[typedKey] === 'object') {
          merged[typedKey] = { ...merged[typedKey], ...value } as any;
        } else {
          // For other objects, do a shallow merge
          merged[typedKey] = { ...merged[typedKey], ...value } as any;
        }
      } else {
        // Direct assignment for primitives and arrays
        merged[typedKey] = value as any;
      }
    }
  });
  
  return merged;
}

// Export singleton instance
export const appSettings = createAppSettingsStore();

// Auto-apply theme when settings change
if (browser) {
  appSettings.subscribe(() => {
    appSettings.applyTheme();
  });
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    appSettings.applyTheme();
  });
  
  // Apply theme on initial load
  appSettings.applyTheme();
}

// Export default settings for testing
export { defaultAppSettings };