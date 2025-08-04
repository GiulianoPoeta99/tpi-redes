// Configuration persistence store
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { TransferConfig } from '../types';
import { defaultTransferConfig } from '../types';

const CONFIG_STORAGE_KEY = 'file-transfer-config';

// Create a writable store for configuration
function createConfigStore() {
  const { subscribe, set, update } = writable<TransferConfig>(defaultTransferConfig);

  return {
    subscribe,
    set,
    update,
    
    // Load configuration from localStorage
    load(): void {
      if (typeof localStorage === 'undefined') return;
      
      try {
        const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (stored) {
          const config = JSON.parse(stored) as TransferConfig;
          // Validate and merge with defaults to handle missing fields
          const mergedConfig = { ...defaultTransferConfig, ...config };
          set(mergedConfig);
        }
      } catch (error) {
        console.warn('Failed to load config from localStorage:', error);
        // Fall back to defaults
        set(defaultTransferConfig);
      }
    },
    
    // Save configuration to localStorage
    save(config: TransferConfig): void {
      set(config);
      
      if (typeof localStorage === 'undefined') return;
      
      try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      } catch (error) {
        console.error('Failed to save config to localStorage:', error);
      }
    },
    
    // Update specific config fields and persist
    updateField<K extends keyof TransferConfig>(field: K, value: TransferConfig[K]): void {
      update(currentConfig => {
        const newConfig = { ...currentConfig, [field]: value };
        
        // Persist to localStorage
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
          } catch (error) {
            console.error('Failed to persist config update:', error);
          }
        }
        
        return newConfig;
      });
    },
    
    // Reset to default configuration
    reset(): void {
      const resetConfig = { ...defaultTransferConfig };
      
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(resetConfig));
        } catch (error) {
          console.error('Failed to persist config reset:', error);
        }
      }
      
      set(resetConfig);
    },
    
    // Export configuration as JSON string
    export(): string {
      const config = get(configStore);
      return JSON.stringify(config, null, 2);
    },
    
    // Import configuration from JSON string
    import(configJson: string): boolean {
      try {
        const config = JSON.parse(configJson) as TransferConfig;
        // Validate the imported config
        const mergedConfig = { ...defaultTransferConfig, ...config };
        this.save(mergedConfig);
        return true;
      } catch (error) {
        console.error('Failed to import config:', error);
        return false;
      }
    },
    
    // Clear all stored configuration
    clear(): void {
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(CONFIG_STORAGE_KEY);
        } catch (error) {
          console.error('Failed to clear stored config:', error);
        }
      }
      set(defaultTransferConfig);
    }
  };
}

export const configStore = createConfigStore();

// Auto-load configuration when the store is created (client-side only)
if (typeof localStorage !== 'undefined') {
  configStore.load();
}

// Configuration validation helpers
export function isConfigValid(config: TransferConfig): boolean {
  if (!config) return false;
  
  // Basic validation - more comprehensive validation is in TransferConfigValidator
  const basicValid = (
    config.port > 0 && 
    config.port <= 65535 &&
    config.chunk_size > 0 &&
    config.timeout > 0
  );
  
  // For transmitter mode, target_ip is required
  if (config.mode === 'Transmitter') {
    return basicValid && config.target_ip !== undefined && config.target_ip.trim() !== '';
  }
  
  // For receiver mode, target_ip is not required
  return basicValid;
}

// Configuration comparison helper
export function configsEqual(a: TransferConfig, b: TransferConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Configuration presets
export const configPresets = {
  tcpLocal: {
    ...defaultTransferConfig,
    protocol: 'Tcp' as const,
    target_ip: 'localhost',
    port: 8080,
  },
  
  udpLocal: {
    ...defaultTransferConfig,
    protocol: 'Udp' as const,
    target_ip: 'localhost',
    port: 8080,
  },
  
  tcpNetwork: {
    ...defaultTransferConfig,
    protocol: 'Tcp' as const,
    port: 8080,
  },
  
  udpNetwork: {
    ...defaultTransferConfig,
    protocol: 'Udp' as const,
    port: 8080,
  },
} as const;