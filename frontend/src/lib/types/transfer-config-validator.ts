import type { TransferConfig } from './transfer-config';

// Configuration validation and utility functions
export class TransferConfigValidator {
  static validate(config: TransferConfig): string[] {
    const errors: string[] = [];
    
    // Validate port range
    if (config.port <= 0 || config.port > 65535) {
      errors.push(`Invalid port number: ${config.port}. Must be between 1 and 65535`);
    }
    
    // Validate chunk size
    if (config.chunk_size <= 0) {
      errors.push('Chunk size must be greater than 0');
    }
    
    if (config.chunk_size > 1024 * 1024) {
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
    if (config.mode === 'Transmitter') {
      if (!config.target_ip || config.target_ip.trim() === '') {
        errors.push('Target IP address is required for transmitter mode');
      } else if (!this.isValidIpAddress(config.target_ip)) {
        errors.push(`Invalid IP address format: ${config.target_ip}`);
      }
    }
    
    return errors;
  }
  
  static isValid(config: TransferConfig): boolean {
    return this.validate(config).length === 0;
  }
  
  static isValidIpAddress(ip: string): boolean {
    // Basic IP validation regex
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === 'localhost';
  }
}