/**
 * @fileoverview Auto-updater functionality for the File Transfer Application.
 * 
 * This module provides automatic update checking and installation capabilities
 * using Tauri's built-in updater system. It handles update notifications,
 * download progress, and installation with user consent.
 * 
 * @author File Transfer Team
 * @version 1.0.0
 */

import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { writable } from 'svelte/store';

/**
 * Update status information
 */
export interface UpdateStatus {
  /** Whether an update is available */
  available: boolean;
  /** Current version */
  currentVersion: string;
  /** Available version (if update available) */
  availableVersion?: string;
  /** Update release notes */
  releaseNotes?: string;
  /** Download progress (0-100) */
  downloadProgress?: number;
  /** Current update state */
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';
  /** Error message if update failed */
  error?: string;
}

/**
 * Update configuration options
 */
export interface UpdateConfig {
  /** Check for updates automatically on startup */
  autoCheck: boolean;
  /** Check interval in milliseconds (default: 24 hours) */
  checkInterval: number;
  /** Show notification when update is available */
  showNotification: boolean;
  /** Automatically download updates (still requires user consent to install) */
  autoDownload: boolean;
}

// Default update configuration
const defaultConfig: UpdateConfig = {
  autoCheck: true,
  checkInterval: 24 * 60 * 60 * 1000, // 24 hours
  showNotification: true,
  autoDownload: false
};

// Update status store
export const updateStatus = writable<UpdateStatus>({
  available: false,
  currentVersion: '1.0.0',
  state: 'idle'
});

// Update configuration store
export const updateConfig = writable<UpdateConfig>(defaultConfig);

/**
 * Check for available updates
 * 
 * @returns Promise that resolves to update information or null if no update
 */
export async function checkForUpdates(): Promise<Update | null> {
  try {
    updateStatus.update(status => ({ ...status, state: 'checking' }));
    
    const update = await check();
    
    if (update?.available) {
      updateStatus.update(status => ({
        ...status,
        available: true,
        availableVersion: update.version,
        releaseNotes: update.body || 'No release notes available',
        state: 'available'
      }));
      
      console.log('Update available:', update.version);
      return update;
    } else {
      updateStatus.update(status => ({
        ...status,
        available: false,
        state: 'idle'
      }));
      
      console.log('No updates available');
      return null;
    }
  } catch (error) {
    console.error('Update check failed:', error);
    updateStatus.update(status => ({
      ...status,
      state: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
    return null;
  }
}

/**
 * Download and install an update
 * 
 * @param update - Update object from checkForUpdates
 * @param onProgress - Optional progress callback
 */
export async function downloadAndInstallUpdate(
  update: Update,
  onProgress?: (progress: number) => void
): Promise<void> {
  try {
    updateStatus.update(status => ({ ...status, state: 'downloading', downloadProgress: 0 }));
    
    // Download the update with progress tracking
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          console.log('Update download started');
          break;
        case 'Progress':
          const progress = Math.round((event.data.chunkLength / event.data.contentLength) * 100);
          updateStatus.update(status => ({ ...status, downloadProgress: progress }));
          onProgress?.(progress);
          console.log(`Download progress: ${progress}%`);
          break;
        case 'Finished':
          console.log('Update download finished');
          updateStatus.update(status => ({ ...status, state: 'ready', downloadProgress: 100 }));
          break;
      }
    });
    
    // Relaunch the application to apply the update
    console.log('Relaunching application to apply update...');
    await relaunch();
    
  } catch (error) {
    console.error('Update installation failed:', error);
    updateStatus.update(status => ({
      ...status,
      state: 'error',
      error: error instanceof Error ? error.message : 'Update installation failed'
    }));
    throw error;
  }
}

/**
 * Show update notification to user
 * 
 * @param update - Update information
 * @returns Promise that resolves to user's choice (true = install, false = skip)
 */
export async function showUpdateDialog(update: Update): Promise<boolean> {
  // This would typically show a modal dialog in the UI
  // For now, we'll use a simple confirm dialog
  const message = `
    A new version (${update.version}) is available!
    
    Current version: ${getCurrentVersion()}
    New version: ${update.version}
    
    Release notes:
    ${update.body || 'No release notes available'}
    
    Would you like to download and install this update?
  `;
  
  return confirm(message);
}

/**
 * Get current application version
 */
export function getCurrentVersion(): string {
  // This would typically come from Tauri's app info
  // For now, return a placeholder
  return '1.0.0';
}

/**
 * Initialize auto-updater system
 * 
 * Sets up automatic update checking based on configuration
 */
export async function initializeUpdater(): Promise<void> {
  const config = await new Promise<UpdateConfig>((resolve) => {
    updateConfig.subscribe(resolve)();
  });
  
  if (config.autoCheck) {
    // Check for updates on startup
    await checkForUpdates();
    
    // Set up periodic update checks
    setInterval(async () => {
      const update = await checkForUpdates();
      
      if (update && config.showNotification) {
        // Show system notification about available update
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Update Available', {
            body: `File Transfer App ${update.version} is available`,
            icon: '/favicon.ico'
          });
        }
      }
    }, config.checkInterval);
  }
}

/**
 * Update configuration settings
 * 
 * @param newConfig - New configuration options
 */
export function updateConfiguration(newConfig: Partial<UpdateConfig>): void {
  updateConfig.update(config => ({ ...config, ...newConfig }));
}

/**
 * Reset update status to idle state
 */
export function resetUpdateStatus(): void {
  updateStatus.update(status => ({
    ...status,
    available: false,
    state: 'idle',
    downloadProgress: undefined,
    error: undefined
  }));
}

/**
 * Check if updates are supported on current platform
 */
export function isUpdateSupported(): boolean {
  // Updates are supported on all desktop platforms with Tauri
  return true;
}

/**
 * Get update server URL (for debugging/configuration)
 */
export function getUpdateServerUrl(): string {
  // This would typically be configured in Tauri config
  return 'https://releases.example.com/file-transfer-app/';
}