import type { TransferStatus } from './transfer-progress';

// Utility functions for working with transfer data
export class TransferUtils {
  static formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
  }
  
  static formatSpeed(bytesPerSecond: number): string {
    return `${this.formatBytes(bytesPerSecond)}/s`;
  }
  
  static formatDuration(seconds: number): string {
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
  
  static formatProgress(progress: number): string {
    return `${(progress * 100).toFixed(1)}%`;
  }
  
  static isTerminalStatus(status: TransferStatus): boolean {
    return status === 'Completed' || status === 'Error' || status === 'Cancelled';
  }
  
  static isActiveStatus(status: TransferStatus): boolean {
    return status === 'Connecting' || status === 'Transferring';
  }
}