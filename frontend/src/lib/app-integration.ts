// Main application integration service for coordinating all event handling and state management
import { browser } from '$app/environment';
import { transferStore } from './stores/transfer';
import { configStore } from './stores/config';
import { notificationStore } from './stores/notifications';
import { eventIntegration } from './event-integration';
import { get } from 'svelte/store';

export interface AppIntegrationConfig {
  enableAutoSave?: boolean;
  enableNotifications?: boolean;
  enableSounds?: boolean;
  autoRetryOnError?: boolean;
  maxRetryAttempts?: number;
  sessionRestoreEnabled?: boolean;
}

const defaultAppConfig: AppIntegrationConfig = {
  enableAutoSave: true,
  enableNotifications: true,
  enableSounds: false,
  autoRetryOnError: false,
  maxRetryAttempts: 3,
  sessionRestoreEnabled: true
};

export class AppIntegrationService {
  private config: AppIntegrationConfig;
  private isInitialized = false;
  private unsubscribers: (() => void)[] = [];

  constructor(config: AppIntegrationConfig = {}) {
    this.config = { ...defaultAppConfig, ...config };
  }

  /**
   * Initialize the entire application integration system
   */
  async initialize(): Promise<void> {
    if (!browser || this.isInitialized) return;

    try {
      console.log('Initializing application integration...');

      // Initialize stores in order
      await this.initializeStores();

      // Set up cross-store integrations
      this.setupStoreIntegrations();

      // Initialize event integration
      await this.initializeEventIntegration();

      // Set up session management
      if (this.config.sessionRestoreEnabled) {
        this.setupSessionManagement();
      }

      // Set up auto-save if enabled
      if (this.config.enableAutoSave) {
        this.setupAutoSave();
      }

      this.isInitialized = true;
      console.log('Application integration initialized successfully');

      // Show initialization success notification
      notificationStore.success(
        'Application Ready',
        'File transfer application is ready to use'
      );

    } catch (error) {
      console.error('Failed to initialize application integration:', error);
      
      notificationStore.error(
        'Initialization Error',
        `Failed to initialize application: ${error}`,
        { persistent: true }
      );
      
      throw error;
    }
  }

  /**
   * Clean up all integrations
   */
  async cleanup(): Promise<void> {
    if (!this.isInitialized) return;

    console.log('Cleaning up application integration...');

    // Clean up event integration
    await eventIntegration.cleanup();

    // Clean up transfer store
    await transferStore.cleanup();

    // Unsubscribe from all store subscriptions
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];

    this.isInitialized = false;
    console.log('Application integration cleaned up');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AppIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update event integration config
    eventIntegration.updateConfig({
      enableNotifications: this.config.enableNotifications,
      enableSounds: this.config.enableSounds,
      autoRetryOnError: this.config.autoRetryOnError,
      maxRetryAttempts: this.config.maxRetryAttempts
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): AppIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Check if the application is properly initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Initialize all stores
   */
  private async initializeStores(): Promise<void> {
    // Initialize config store (loads from localStorage)
    configStore.load();

    // Initialize transfer store (sets up event listeners)
    await transferStore.initialize();

    console.log('Stores initialized');
  }

  /**
   * Set up integrations between different stores
   */
  private setupStoreIntegrations(): void {
    // Sync transfer config changes with config store
    const configUnsubscriber = configStore.subscribe(config => {
      transferStore.updateConfig(config);
    });
    this.unsubscribers.push(configUnsubscriber);

    // Handle transfer errors by showing notifications
    const errorUnsubscriber = transferStore.subscribe(state => {
      if (state.lastError && this.config.enableNotifications) {
        const error = state.lastError;
        
        notificationStore.error(
          'Transfer Error',
          error.message,
          {
            persistent: !error.recoverable,
            actions: error.recoverable ? [
              {
                label: 'Retry',
                action: () => this.handleErrorRetry(error),
                style: 'primary'
              },
              {
                label: 'Dismiss',
                action: () => transferStore.clearError(),
                style: 'secondary'
              }
            ] : [
              {
                label: 'Dismiss',
                action: () => transferStore.clearError(),
                style: 'secondary'
              }
            ]
          }
        );
      }
    });
    this.unsubscribers.push(errorUnsubscriber);

    console.log('Store integrations set up');
  }

  /**
   * Initialize event integration service
   */
  private async initializeEventIntegration(): Promise<void> {
    await eventIntegration.initialize();
    
    // Update event integration config based on app config
    eventIntegration.updateConfig({
      enableNotifications: this.config.enableNotifications,
      enableSounds: this.config.enableSounds,
      autoRetryOnError: this.config.autoRetryOnError,
      maxRetryAttempts: this.config.maxRetryAttempts
    });

    console.log('Event integration initialized');
  }

  /**
   * Set up session management for state persistence and restoration
   */
  private setupSessionManagement(): void {
    // Save application state periodically
    const saveInterval = setInterval(() => {
      this.saveApplicationState();
    }, 30000); // Save every 30 seconds

    // Clean up interval on page unload
    if (browser) {
      window.addEventListener('beforeunload', () => {
        clearInterval(saveInterval);
        this.saveApplicationState();
      });
    }

    // Restore application state on initialization
    this.restoreApplicationState();

    console.log('Session management set up');
  }

  /**
   * Set up auto-save functionality
   */
  private setupAutoSave(): void {
    // Auto-save config changes
    const configUnsubscriber = configStore.subscribe(config => {
      if (this.isInitialized) {
        configStore.save(config);
      }
    });
    this.unsubscribers.push(configUnsubscriber);

    console.log('Auto-save set up');
  }

  /**
   * Handle error retry logic
   */
  private async handleErrorRetry(error: any): Promise<void> {
    try {
      transferStore.clearError();
      
      notificationStore.info(
        'Retrying Transfer',
        'Attempting to retry the failed transfer...'
      );

      // Get current config and retry the transfer
      const state = get(transferStore);
      const config = get(configStore);
      
      if (state.config.filename && config.mode === 'Transmitter') {
        // This would need to be implemented with proper file path handling
        console.log('Retry logic would be implemented here');
        
        notificationStore.warning(
          'Retry Not Implemented',
          'Automatic retry is not yet implemented. Please try again manually.'
        );
      }
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      
      notificationStore.error(
        'Retry Failed',
        `Failed to retry transfer: ${retryError}`
      );
    }
  }

  /**
   * Save current application state to localStorage
   */
  private saveApplicationState(): void {
    if (!browser) return;

    try {
      const state = {
        timestamp: Date.now(),
        transferState: get(transferStore),
        configState: get(configStore),
        notifications: get(notificationStore)
      };

      localStorage.setItem('app-state', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save application state:', error);
    }
  }

  /**
   * Restore application state from localStorage
   */
  private restoreApplicationState(): void {
    if (!browser) return;

    try {
      const stored = localStorage.getItem('app-state');
      if (!stored) return;

      const state = JSON.parse(stored);
      const age = Date.now() - state.timestamp;
      
      // Only restore if state is less than 1 hour old
      if (age > 3600000) {
        localStorage.removeItem('app-state');
        return;
      }

      // Restore non-sensitive state
      if (state.configState) {
        configStore.save(state.configState);
      }

      console.log('Application state restored');
    } catch (error) {
      console.warn('Failed to restore application state:', error);
      // Clean up corrupted state
      localStorage.removeItem('app-state');
    }
  }

  /**
   * Export application state for debugging
   */
  exportState(): any {
    return {
      config: this.config,
      isInitialized: this.isInitialized,
      transferState: get(transferStore),
      configState: get(configStore),
      notifications: get(notificationStore)
    };
  }

  /**
   * Reset application to default state
   */
  async reset(): Promise<void> {
    console.log('Resetting application state...');

    // Clear all stores
    transferStore.clearHistory();
    transferStore.clearError();
    configStore.reset();
    notificationStore.clear();

    // Clear localStorage
    if (browser) {
      localStorage.removeItem('app-state');
    }

    notificationStore.success(
      'Application Reset',
      'Application has been reset to default state'
    );

    console.log('Application state reset complete');
  }
}

// Singleton instance for global use
export const appIntegration = new AppIntegrationService();

// Auto-initialize when in browser environment
if (browser) {
  appIntegration.initialize().catch(console.error);

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    appIntegration.cleanup().catch(console.error);
  });
}