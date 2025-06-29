// TypeScript interfaces matching backend types

export interface TransferProgress {
  transferId: string;
  progress: number;        // 0.0 - 1.0
  speed: number;           // bytes per second
  eta: number;             // seconds remaining
  status: 'idle' | 'connecting' | 'transferring' | 'completed' | 'error';
  error?: string;
}

export type TransferStatus = 'idle' | 'connecting' | 'transferring' | 'completed' | 'error';
export type Protocol = 'tcp' | 'udp';
export type TransferMode = 'transmitter' | 'receiver';

export interface TransferConfig {
  mode: TransferMode;
  protocol: Protocol;
  targetIp?: string;
  port: number;
  filename?: string;
  chunkSize: number;
  timeout: number;
}

// Configuration validation and utility functions
export class TransferConfigValidator {
  static validate(config: TransferConfig): string[] {
    const errors: string[] = [];
    
    // Validate port range
    if (config.port <= 0 || config.port > 65535) {
      errors.push(`Invalid port number: ${config.port}. Must be between 1 and 65535`);
    }
    
    // Validate chunk size
    if (config.chunkSize <= 0) {
      errors.push('Chunk size must be greater than 0');
    }
    
    if (config.chunkSize > 1024 * 1024) {
      errors.push('Chunk size must not exceed 1MB');
    }
    
    // Validate timeout
    if (config.timeout <= 0) {
      errors.push('Timeout must be greater than 0 seconds');
    }
    
    if (config.timeout > 3600) {
      errors.push('Timeout must not exceed 1 hour');
    }
    
    // Validate target IP for transmitter mode
    if (config.mode === 'transmitter') {
      if (!config.targetIp || config.targetIp.trim() === '') {
        errors.push('Target IP address is required for transmitter mode');
      } else if (!this.isValidIpAddress(config.targetIp)) {
        errors.push(`Invalid IP address format: ${config.targetIp}`);
      }
    }
    
    return errors;
  }
  
  static isValid(config: TransferConfig): boolean {
    return this.validate(config).length === 0;
  }
  
  private static isValidIpAddress(ip: string): boolean {
    // Basic IP validation regex
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === 'localhost';
  }
}

export const defaultTransferConfig: TransferConfig = {
  mode: 'transmitter',
  protocol: 'tcp',
  targetIp: undefined,
  port: 8080,
  filename: undefined,
  chunkSize: 8192,
  timeout: 30,
};

export interface TransferRecord {
  id: string;
  filename: string;
  size: number;
  mode: 'sent' | 'received';
  protocol: 'tcp' | 'udp';
  target: string;
  status: 'completed' | 'failed' | 'cancelled';
  timestamp: Date;
  duration: number;
  checksum: string;
  error?: string;
}

export interface TransferResult {
  success: boolean;
  transferId: string;
  bytesTransferred: number;
  duration: number;
  checksum: string;
  error?: string;
}

// TransferError is now defined in error-handling.ts
// Re-export for backward compatibility
export { TransferError } from './error-handling';

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
    return status === 'completed' || status === 'error';
  }
  
  static isActiveStatus(status: TransferStatus): boolean {
    return status === 'connecting' || status === 'transferring';
  }
}