// Tauri command interface with error handling
import { invoke } from '@tauri-apps/api/core';
import type { TransferConfig, TransferProgress } from './types';
import { TransferError, RetryHandler, defaultRetryConfig } from './error-handling';

export interface TauriCommands {
  transfer_file(config: TransferConfig, filePath: string, target: string): Promise<string>;
  receive_file(port: number, protocol: string, outputDir: string): Promise<string>;
  get_progress(transferId: string): Promise<TransferProgress>;
  cancel_transfer_cmd(transferId: string): Promise<void>;
}

// Wrapper function to handle Tauri command errors
async function invokeWithErrorHandling<T>(
  command: string,
  args?: Record<string, any>,
  retryConfig = defaultRetryConfig
): Promise<T> {
  const retryHandler = new RetryHandler(retryConfig);
  
  return retryHandler.retry(async () => {
    try {
      return await invoke<T>(command, args);
    } catch (error) {
      throw TransferError.fromBackendError(error);
    }
  });
}

export const tauriCommands: TauriCommands = {
  async transfer_file(config, filePath, target) {
    return await invokeWithErrorHandling<string>('transfer_file', { 
      config, 
      filePath, 
      target 
    });
  },
  
  async receive_file(port, protocol, outputDir) {
    return await invokeWithErrorHandling<string>('receive_file', { 
      port, 
      protocol, 
      outputDir 
    });
  },
  
  async get_progress(transferId) {
    // Don't retry progress queries as aggressively
    const quickRetryConfig = {
      ...defaultRetryConfig,
      maxAttempts: 2,
      initialDelay: 500,
    };
    
    return await invokeWithErrorHandling<TransferProgress>('get_progress', { 
      transferId 
    }, quickRetryConfig);
  },
  
  async cancel_transfer_cmd(transferId) {
    // Don't retry cancellation commands
    const noRetryConfig = {
      ...defaultRetryConfig,
      maxAttempts: 1,
    };
    
    return await invokeWithErrorHandling<void>('cancel_transfer_cmd', { 
      transferId 
    }, noRetryConfig);
  }
};

// Utility functions for common error scenarios
export class TauriErrorHandler {
  static async handleFileSelection(): Promise<string | null> {
    try {
      // This would integrate with Tauri's file dialog
      const result = await invoke<string | null>('select_file');
      return result;
    } catch (error) {
      const transferError = TransferError.fromBackendError(error);
      
      // Handle specific file selection errors
      if (transferError.code === 'CANCELLED') {
        return null; // User cancelled, not an error
      }
      
      throw transferError;
    }
  }

  static async validateConfiguration(config: TransferConfig): Promise<void> {
    try {
      await invoke('validate_config', { config });
    } catch (error) {
      throw TransferError.fromBackendError(error);
    }
  }

  static async checkConnectivity(address: string, timeout: number = 5000): Promise<boolean> {
    try {
      await invoke('check_connectivity', { address, timeout });
      return true;
    } catch (error) {
      const transferError = TransferError.fromBackendError(error);
      
      // Connectivity check failures are not necessarily errors
      if (['NETWORK_ERROR', 'CONNECTION_REFUSED', 'TIMEOUT'].includes(transferError.code)) {
        return false;
      }
      
      throw transferError;
    }
  }
}