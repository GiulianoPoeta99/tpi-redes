// Event integration service for coordinating Tauri events with application state
import { get } from 'svelte/store';
import { browser } from '$app/environment';
import { 
  eventManager,
  type TransferStartedEvent,
  type TransferProgressEvent,
  type TransferErrorEvent,
  type TransferCompletedEvent,
  type TransferCancelledEvent,
  type TransferConnectionEvent
} from './tauri-events';
import { transferStore } from './stores/transfer';
import { TransferError } from './error-handling';

export interface EventIntegrationConfig {
  enableNotifications?: boolean;
  enableSounds?: boolean;
  autoRetryOnError?: boolean;
  maxRetryAttempts?: number;
  retryDelayMs?: number;
}

const defaultConfig: EventIntegrationConfig = {
  enableNotifications: true,
  enableSounds: false,
  autoRetryOnError: false,
  maxRetryAttempts: 3,
  retryDelayMs: 1000
};

export class EventIntegrationService {
  private config: EventIntegrationConfig;
  private isInitialized = false;
  private retryAttempts = new Map<string, number>();

  constructor(config: EventIntegrationConfig = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Initialize the event integration service
   */
  async initialize(): Promise<void> {
    if (!browser || this.isInitialized) return;

    try {
      // Set up comprehensive event listeners
      await eventManager.setupEventListeners({
        onStarted: this.handleTransferStarted.bind(this),
        onProgress: this.handleTransferProgress.bind(this),
        onError: this.handleTransferError.bind(this),
        onCompleted: this.handleTransferCompleted.bind(this),
        onCancelled: this.handleTransferCancelled.bind(this),
        onConnection: this.handleConnectionEvent.bind(this)
      });

      this.isInitialized = true;
      console.log('Event integration service initialized');
    } catch (error) {
      console.error('Failed to initialize event integration service:', error);
      throw error;
    }
  }

  /**
   * Clean up the service
   */
  async cleanup(): Promise<void> {
    if (!this.isInitialized) return;

    await eventManager.cleanup();
    this.retryAttempts.clear();
    this.isInitialized = false;
    console.log('Event integration service cleaned up');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EventIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Handle transfer started events
   */
  private handleTransferStarted(event: TransferStartedEvent): void {
    console.log('Transfer started:', event);

    // Reset retry attempts for this transfer
    this.retryAttempts.delete(event.transfer_id);

    // Show notification if enabled
    if (this.config.enableNotifications) {
      this.showNotification(
        'Transfer Started',
        `Started ${event.mode.toLowerCase()} of ${event.filename} via ${event.protocol}`,
        'info'
      );
    }

    // Play sound if enabled
    if (this.config.enableSounds) {
      this.playSound('start');
    }
  }

  /**
   * Handle transfer progress events
   */
  private handleTransferProgress(event: TransferProgressEvent): void {
    // Progress events are handled by the store directly
    // This handler can be used for additional UI feedback
    
    // Log significant progress milestones
    const progressPercent = Math.floor(event.progress * 100);
    if (progressPercent % 25 === 0 && progressPercent > 0) {
      console.log(`Transfer ${event.transfer_id} progress: ${progressPercent}%`);
    }
  }

  /**
   * Handle transfer error events with retry logic
   */
  private async handleTransferError(event: TransferErrorEvent): Promise<void> {
    console.error('Transfer error:', event);

    const currentAttempts = this.retryAttempts.get(event.transfer_id) || 0;

    // Show error notification
    if (this.config.enableNotifications) {
      const message = event.recoverable && this.config.autoRetryOnError && currentAttempts < this.config.maxRetryAttempts!
        ? `Transfer error (will retry): ${event.error_message}`
        : `Transfer failed: ${event.error_message}`;
      
      this.showNotification('Transfer Error', message, 'error');
    }

    // Play error sound if enabled
    if (this.config.enableSounds) {
      this.playSound('error');
    }

    // Attempt retry if configured and error is recoverable
    if (this.config.autoRetryOnError && 
        event.recoverable && 
        currentAttempts < this.config.maxRetryAttempts!) {
      
      this.retryAttempts.set(event.transfer_id, currentAttempts + 1);
      
      console.log(`Retrying transfer ${event.transfer_id} (attempt ${currentAttempts + 1}/${this.config.maxRetryAttempts})`);
      
      // Wait before retry
      setTimeout(async () => {
        try {
          // Get current transfer config and retry
          const state = get(transferStore);
          if (state.config && state.config.filename) {
            // This would need to be implemented in transferActions
            console.log('Retry logic would be implemented here');
          }
        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }
      }, this.config.retryDelayMs! * (currentAttempts + 1)); // Exponential backoff
    }
  }

  /**
   * Handle transfer completed events
   */
  private handleTransferCompleted(event: TransferCompletedEvent): void {
    console.log('Transfer completed:', event);

    // Clear retry attempts
    this.retryAttempts.delete(event.transfer_id);

    // Show completion notification
    if (this.config.enableNotifications) {
      const message = event.success 
        ? `Transfer completed successfully (${this.formatBytes(event.bytes_transferred)})`
        : 'Transfer completed with errors';
      
      this.showNotification(
        'Transfer Complete', 
        message, 
        event.success ? 'success' : 'warning'
      );
    }

    // Play completion sound if enabled
    if (this.config.enableSounds) {
      this.playSound(event.success ? 'success' : 'error');
    }
  }

  /**
   * Handle transfer cancelled events
   */
  private handleTransferCancelled(event: TransferCancelledEvent): void {
    console.log('Transfer cancelled:', event);

    // Clear retry attempts
    this.retryAttempts.delete(event.transfer_id);

    // Show cancellation notification
    if (this.config.enableNotifications) {
      this.showNotification(
        'Transfer Cancelled',
        `Transfer was cancelled: ${event.reason}`,
        'warning'
      );
    }

    // Play cancellation sound if enabled
    if (this.config.enableSounds) {
      this.playSound('cancel');
    }
  }

  /**
   * Handle connection events
   */
  private handleConnectionEvent(event: TransferConnectionEvent): void {
    console.log('Connection event:', event);

    // Show connection status notifications for important events
    if (this.config.enableNotifications) {
      switch (event.event_type) {
        case 'connected':
          this.showNotification(
            'Connected',
            `Connected to ${event.address} via ${event.protocol}`,
            'success'
          );
          break;
        case 'listening':
          this.showNotification(
            'Listening',
            `Listening on ${event.address} for ${event.protocol} connections`,
            'info'
          );
          break;
        case 'disconnected':
          this.showNotification(
            'Disconnected',
            `Disconnected from ${event.address}`,
            'warning'
          );
          break;
      }
    }
  }

  /**
   * Show system notification
   */
  private showNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
    if (!browser) return;

    // Dispatch custom event that will be handled by the notification system
    window.dispatchEvent(new CustomEvent('transfer-notification', {
      detail: { title, message, type }
    }));
  }

  /**
   * Get notification icon based on type
   */
  private getNotificationIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  }

  /**
   * Play notification sound
   */
  private playSound(type: 'start' | 'success' | 'error' | 'cancel'): void {
    if (!browser) return;

    // This would play different sounds based on the event type
    // For now, just use a simple beep
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different event types
      const frequencies = {
        start: 440,    // A4
        success: 523,  // C5
        error: 220,    // A3
        cancel: 330    // E4
      };

      oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}

// Singleton instance for global use
export const eventIntegration = new EventIntegrationService();

// Auto-initialize when in browser environment
if (browser) {
  eventIntegration.initialize().catch(console.error);
}