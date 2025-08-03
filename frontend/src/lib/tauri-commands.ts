// Tauri command interface for frontend integration
import { invoke } from '@tauri-apps/api/core';
import type { TransferConfig, TransferProgress } from './types';

// Error type returned by Tauri commands
export interface TauriError {
  message: string;
  code: string;
}

// Tauri command interface
export class TauriCommands {
  /**
   * Initialize the backend orchestrator
   */
  static async initializeBackend(): Promise<void> {
    try {
      await invoke('initialize_backend');
    } catch (error) {
      throw new Error(`Failed to initialize backend: ${error}`);
    }
  }

  /**
   * Start a file transfer
   * @param config Transfer configuration
   * @param filePath Path to the file to transfer
   * @param target Target address (IP:port)
   * @returns Transfer ID
   */
  static async transferFile(
    config: TransferConfig,
    filePath: string,
    target: string
  ): Promise<string> {
    try {
      return await invoke<string>('transfer_file', {
        config,
        filePath,
        target,
      });
    } catch (error) {
      const tauriError = error as TauriError;
      throw new Error(`Transfer failed: ${tauriError.message}`);
    }
  }

  /**
   * Start file receiver
   * @param port Port to listen on
   * @param protocol Protocol to use ('Tcp' or 'Udp')
   * @param outputDir Directory to save received files
   * @returns Transfer ID
   */
  static async receiveFile(
    port: number,
    protocol: 'Tcp' | 'Udp',
    outputDir: string
  ): Promise<string> {
    try {
      return await invoke<string>('receive_file', {
        port,
        protocol,
        outputDir,
      });
    } catch (error) {
      const tauriError = error as TauriError;
      throw new Error(`Receiver failed: ${tauriError.message}`);
    }
  }

  /**
   * Get transfer progress
   * @param transferId Transfer ID
   * @returns Transfer progress information
   */
  static async getProgress(transferId: string): Promise<TransferProgress> {
    try {
      return await invoke<TransferProgress>('get_progress', {
        transferId,
      });
    } catch (error) {
      const tauriError = error as TauriError;
      throw new Error(`Failed to get progress: ${tauriError.message}`);
    }
  }

  /**
   * Cancel a transfer
   * @param transferId Transfer ID to cancel
   */
  static async cancelTransfer(transferId: string): Promise<void> {
    try {
      await invoke('cancel_transfer_cmd', {
        transferId,
      });
    } catch (error) {
      const tauriError = error as TauriError;
      throw new Error(`Failed to cancel transfer: ${tauriError.message}`);
    }
  }

  /**
   * Validate transfer configuration
   * @param config Configuration to validate
   * @returns True if valid
   */
  static async validateConfig(config: TransferConfig): Promise<boolean> {
    try {
      return await invoke<boolean>('validate_config', {
        config,
      });
    } catch (error) {
      const tauriError = error as TauriError;
      throw new Error(`Configuration validation failed: ${tauriError.message}`);
    }
  }

  /**
   * Check if receiver is available at target address
   * @param protocol Protocol to check ('Tcp' or 'Udp')
   * @param targetIp Target IP address
   * @param port Target port
   * @param timeoutSeconds Timeout in seconds
   * @returns True if receiver is available
   */
  static async checkReceiverAvailability(
    protocol: 'Tcp' | 'Udp',
    targetIp: string,
    port: number,
    timeoutSeconds: number = 5
  ): Promise<boolean> {
    try {
      return await invoke<boolean>('check_receiver_availability', {
        protocol,
        targetIp,
        port,
        timeoutSeconds,
      });
    } catch (error) {
      const tauriError = error as TauriError;
      throw new Error(`Failed to check receiver availability: ${tauriError.message}`);
    }
  }
}

// Export individual functions for convenience
export const {
  initializeBackend,
  transferFile,
  receiveFile,
  getProgress,
  cancelTransfer,
  validateConfig,
  checkReceiverAvailability,
} = TauriCommands;