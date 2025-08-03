// Example of how to use the Tauri command interface and event system
import { TauriCommands } from './tauri-commands';
import { TauriEventManager } from './tauri-events';
import type { TransferConfig } from './types';

/**
 * Example class showing how to integrate Tauri commands and events
 * for file transfer operations
 */
export class FileTransferManager {
  private eventManager: TauriEventManager;
  private currentTransferId: string | null = null;

  constructor() {
    this.eventManager = new TauriEventManager();
    this.setupEventListeners();
  }

  /**
   * Initialize the backend and set up event listeners
   */
  async initialize(): Promise<void> {
    try {
      await TauriCommands.initializeBackend();
      console.log('Backend initialized successfully');
    } catch (error) {
      console.error('Failed to initialize backend:', error);
      throw error;
    }
  }

  /**
   * Start a file transfer
   */
  async startTransfer(
    config: TransferConfig,
    filePath: string,
    targetAddress: string
  ): Promise<string> {
    try {
      // Validate configuration first
      const isValid = await TauriCommands.validateConfig(config);
      if (!isValid) {
        throw new Error('Invalid configuration');
      }

      // Check if receiver is available (for TCP)
      if (config.protocol === 'Tcp' && config.target_ip) {
        const isAvailable = await TauriCommands.checkReceiverAvailability(
          config.protocol,
          config.target_ip,
          config.port,
          5 // 5 second timeout
        );
        
        if (!isAvailable) {
          throw new Error(`Receiver not available at ${config.target_ip}:${config.port}`);
        }
      }

      // Start the transfer
      const transferId = await TauriCommands.transferFile(config, filePath, targetAddress);
      this.currentTransferId = transferId;
      
      console.log(`Transfer started with ID: ${transferId}`);
      return transferId;
    } catch (error) {
      console.error('Failed to start transfer:', error);
      throw error;
    }
  }

  /**
   * Start receiving files
   */
  async startReceiver(
    port: number,
    protocol: 'Tcp' | 'Udp',
    outputDir: string
  ): Promise<string> {
    try {
      const transferId = await TauriCommands.receiveFile(port, protocol, outputDir);
      this.currentTransferId = transferId;
      
      console.log(`Receiver started with ID: ${transferId} on port ${port}`);
      return transferId;
    } catch (error) {
      console.error('Failed to start receiver:', error);
      throw error;
    }
  }

  /**
   * Get current transfer progress
   */
  async getProgress(): Promise<any> {
    if (!this.currentTransferId) {
      throw new Error('No active transfer');
    }

    try {
      return await TauriCommands.getProgress(this.currentTransferId);
    } catch (error) {
      console.error('Failed to get progress:', error);
      throw error;
    }
  }

  /**
   * Cancel current transfer
   */
  async cancelTransfer(): Promise<void> {
    if (!this.currentTransferId) {
      throw new Error('No active transfer to cancel');
    }

    try {
      await TauriCommands.cancelTransfer(this.currentTransferId);
      console.log(`Transfer ${this.currentTransferId} cancelled`);
      this.currentTransferId = null;
    } catch (error) {
      console.error('Failed to cancel transfer:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for transfer events
   */
  private async setupEventListeners(): Promise<void> {
    await this.eventManager.setupEventListeners({
      onStarted: (event) => {
        console.log('Transfer started:', event);
        this.currentTransferId = event.transfer_id;
      },

      onProgress: (event) => {
        console.log(`Transfer progress: ${(event.progress * 100).toFixed(1)}%`);
        console.log(`Speed: ${this.formatSpeed(event.speed)}`);
        console.log(`ETA: ${this.formatDuration(event.eta)}`);
      },

      onCompleted: (event) => {
        console.log('Transfer completed:', event);
        console.log(`Transferred ${event.bytes_transferred} bytes in ${event.duration}s`);
        console.log(`Checksum: ${event.checksum}`);
        this.currentTransferId = null;
      },

      onError: (event) => {
        console.error('Transfer error:', event);
        console.error(`Error: ${event.error_message} (${event.error_code})`);
        console.error(`Recoverable: ${event.recoverable}`);
        this.currentTransferId = null;
      },

      onCancelled: (event) => {
        console.log('Transfer cancelled:', event);
        console.log(`Reason: ${event.reason}`);
        this.currentTransferId = null;
      },

      onConnection: (event) => {
        console.log('Connection event:', event);
        console.log(`${event.event_type} - ${event.address} (${event.protocol})`);
      },
    });
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.eventManager.cleanup();
    this.currentTransferId = null;
  }

  /**
   * Format bytes per second to human readable string
   */
  private formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond < 1024) {
      return `${bytesPerSecond.toFixed(1)} B/s`;
    } else if (bytesPerSecond < 1024 * 1024) {
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    } else if (bytesPerSecond < 1024 * 1024 * 1024) {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
    } else {
      return `${(bytesPerSecond / (1024 * 1024 * 1024)).toFixed(1)} GB/s`;
    }
  }

  /**
   * Format duration in seconds to human readable string
   */
  private formatDuration(seconds: number): string {
    if (seconds === 0) {
      return 'Unknown';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

/**
 * Example usage of the FileTransferManager
 */
export async function exampleUsage(): Promise<void> {
  const manager = new FileTransferManager();

  try {
    // Initialize the backend
    await manager.initialize();

    // Example 1: Start a TCP file transfer
    const tcpConfig: TransferConfig = {
      mode: 'Transmitter',
      protocol: 'Tcp',
      target_ip: '192.168.1.100',
      port: 8080,
      filename: 'document.pdf',
      chunk_size: 8192,
      timeout: 30,
    };

    const transferId = await manager.startTransfer(
      tcpConfig,
      '/path/to/document.pdf',
      '192.168.1.100:8080'
    );

    // Monitor progress (in a real app, this would be done via events)
    const progress = await manager.getProgress();
    console.log('Current progress:', progress);

    // Example 2: Start a UDP receiver
    const receiverId = await manager.startReceiver(8080, 'Udp', '/downloads');

    // Example 3: Cancel transfer if needed
    // await manager.cancelTransfer();

  } catch (error) {
    console.error('Transfer operation failed:', error);
  } finally {
    // Clean up
    await manager.cleanup();
  }
}

// Export for use in components
export default FileTransferManager;