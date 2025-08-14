// Frontend error handling utilities
import { writable, type Writable } from 'svelte/store';

export interface ErrorContext {
  transferId?: string;
  operation?: string;
  timestamp: Date;
  userAction?: string;
}

export class TransferError extends Error {
  public readonly code: string;
  public readonly transferId?: string;
  public readonly recoverable: boolean;
  public readonly context?: string;
  public readonly recoverySuggestion?: string;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    options: {
      transferId?: string;
      recoverable?: boolean;
      context?: string;
      recoverySuggestion?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = 'TransferError';
    this.code = code;
    this.transferId = options.transferId;
    this.recoverable = options.recoverable ?? false;
    this.context = options.context;
    this.recoverySuggestion = options.recoverySuggestion;
    this.timestamp = new Date();
  }

  static fromBackendError(backendError: any): TransferError {
    if (typeof backendError === 'string') {
      return new TransferError(backendError, 'UNKNOWN_ERROR');
    }

    const message = backendError.message || 'Unknown error occurred';
    const code = backendError.code || 'UNKNOWN_ERROR';
    const recoverable = backendError.recoverable ?? false;
    const context = backendError.context;
    const recoverySuggestion = ErrorRecovery.getRecoverySuggestion(code, context);

    return new TransferError(message, code, {
      recoverable,
      context,
      recoverySuggestion,
    });
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      transferId: this.transferId,
      recoverable: this.recoverable,
      context: this.context,
      recoverySuggestion: this.recoverySuggestion,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

export class ErrorRecovery {
  private static readonly ERROR_MESSAGES: Record<string, string> = {
    NETWORK_ERROR: 'Network connection failed',
    FILE_ERROR: 'File operation failed',
    CHECKSUM_MISMATCH: 'File integrity check failed',
    TIMEOUT: 'Operation timed out',
    PROTOCOL_ERROR: 'Communication protocol error',
    CONFIG_ERROR: 'Configuration is invalid',
    CANCELLED: 'Transfer was cancelled',
    CONNECTION_REFUSED: 'Connection was refused by target',
    PERMISSION_DENIED: 'Permission denied',
    INSUFFICIENT_SPACE: 'Not enough disk space',
    FILE_NOT_FOUND: 'File not found',
    CORRUPTED_DATA: 'Data corruption detected',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    UNKNOWN_ERROR: 'An unknown error occurred',
  };

  private static readonly RECOVERY_SUGGESTIONS: Record<string, string> = {
    NETWORK_ERROR: 'Check your network connection and try again',
    CONNECTION_REFUSED: 'Ensure the target device is reachable and accepting connections',
    FILE_NOT_FOUND: 'Verify that the file exists and is accessible',
    PERMISSION_DENIED: 'Check file and folder permissions',
    INSUFFICIENT_SPACE: 'Free up disk space and try again',
    CHECKSUM_MISMATCH: 'The file may be corrupted. Try transferring again',
    TIMEOUT: 'Check network conditions and try again with a longer timeout',
    RATE_LIMIT_EXCEEDED: 'Wait a moment before trying again',
    CORRUPTED_DATA: 'Try transferring the file again',
    CONFIG_ERROR: 'Check your configuration settings',
  };

  static getUserFriendlyMessage(errorCode: string): string {
    return this.ERROR_MESSAGES[errorCode] || 'An unexpected error occurred';
  }

  static getRecoverySuggestion(errorCode: string, context?: string): string | undefined {
    let suggestion = this.RECOVERY_SUGGESTIONS[errorCode];
    
    // Add context-specific suggestions
    if (context && suggestion) {
      switch (errorCode) {
        case 'FILE_NOT_FOUND':
          suggestion = `Verify that the file '${context}' exists and is accessible`;
          break;
        case 'CONNECTION_REFUSED':
          suggestion = `Ensure the target '${context}' is reachable and accepting connections`;
          break;
        case 'PERMISSION_DENIED':
          suggestion = `Check permissions for '${context}'`;
          break;
        case 'INSUFFICIENT_SPACE':
          suggestion = `Free up disk space in '${context}' and try again`;
          break;
      }
    }
    
    return suggestion;
  }

  static isRecoverable(errorCode: string): boolean {
    const recoverableErrors = [
      'NETWORK_ERROR',
      'CONNECTION_REFUSED',
      'TIMEOUT',
      'CHECKSUM_MISMATCH',
      'CORRUPTED_DATA',
      'RATE_LIMIT_EXCEEDED',
    ];
    return recoverableErrors.includes(errorCode);
  }

  static shouldAutoRetry(errorCode: string, attemptCount: number, maxAttempts: number): boolean {
    if (attemptCount >= maxAttempts) {
      return false;
    }

    const autoRetryErrors = [
      'NETWORK_ERROR',
      'CONNECTION_REFUSED',
      'TIMEOUT',
      'RATE_LIMIT_EXCEEDED',
    ];
    
    return autoRetryErrors.includes(errorCode);
  }

  static getRetryDelay(errorCode: string, attemptCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    
    let delay = baseDelay * Math.pow(2, attemptCount - 1); // Exponential backoff
    
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    delay += jitter;
    
    // Special cases with more sophisticated handling
    switch (errorCode) {
      case 'RATE_LIMIT_EXCEEDED':
        delay = Math.max(delay, 5000); // Minimum 5 seconds for rate limits
        break;
      case 'NETWORK_ERROR':
        delay = Math.min(delay, 10000); // Cap at 10 seconds for network errors
        break;
      case 'CONNECTION_REFUSED':
        delay = Math.min(delay * 0.75, 8000); // Slightly faster retry for connection issues
        break;
      case 'TIMEOUT':
        delay = Math.min(delay * 1.5, 15000); // Longer delay for timeouts
        break;
      case 'CHECKSUM_MISMATCH':
        delay = Math.max(delay, 2000); // Minimum 2 seconds for checksum issues
        break;
      case 'CORRUPTED_DATA':
        delay = Math.max(delay, 3000); // Minimum 3 seconds for data corruption
        break;
    }
    
    return Math.min(delay, maxDelay);
  }

  static getTimeoutRecommendation(errorCode: string, context?: string): string | undefined {
    switch (errorCode) {
      case 'TIMEOUT':
        if (context?.includes('connect')) {
          return 'Try increasing the connection timeout in settings';
        } else if (context?.includes('read')) {
          return 'Try increasing the read timeout for slow networks';
        } else if (context?.includes('write')) {
          return 'Try increasing the write timeout for slow uploads';
        }
        return 'Consider increasing timeout values in settings';
      case 'NETWORK_ERROR':
        return 'Check network stability and consider increasing timeouts';
      case 'CONNECTION_REFUSED':
        return 'Verify the target is running and accessible';
      default:
        return undefined;
    }
  }
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

export class RetryHandler {
  constructor(private config: RetryConfig = defaultRetryConfig) {}

  async retry<T>(
    operation: () => Promise<T>,
    errorHandler?: (error: TransferError, attempt: number) => boolean
  ): Promise<T> {
    let lastError: TransferError;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const transferError = error instanceof TransferError 
          ? error 
          : TransferError.fromBackendError(error);
        
        lastError = transferError;
        
        // Check if we should continue retrying
        const shouldRetry = attempt < this.config.maxAttempts && 
                           transferError.recoverable &&
                           ErrorRecovery.shouldAutoRetry(transferError.code, attempt, this.config.maxAttempts);
        
        // Allow custom error handler to override retry decision
        const customShouldRetry = errorHandler?.(transferError, attempt) ?? shouldRetry;
        
        if (!customShouldRetry) {
          throw transferError;
        }
        
        // Calculate delay for next attempt
        const delay = ErrorRecovery.getRetryDelay(transferError.code, attempt);
        console.warn(`Attempt ${attempt} failed: ${transferError.message}. Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  async retryWithProgress<T>(
    operation: () => Promise<T>,
    onProgress?: (attempt: number, maxAttempts: number, error: TransferError) => void,
    errorHandler?: (error: TransferError, attempt: number) => boolean
  ): Promise<T> {
    let lastError: TransferError;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const transferError = error instanceof TransferError 
          ? error 
          : TransferError.fromBackendError(error);
        
        lastError = transferError;
        
        // Notify progress callback
        onProgress?.(attempt, this.config.maxAttempts, transferError);
        
        // Check if we should continue retrying
        const shouldRetry = attempt < this.config.maxAttempts && 
                           transferError.recoverable &&
                           ErrorRecovery.shouldAutoRetry(transferError.code, attempt, this.config.maxAttempts);
        
        // Allow custom error handler to override retry decision
        const customShouldRetry = errorHandler?.(transferError, attempt) ?? shouldRetry;
        
        if (!customShouldRetry) {
          throw transferError;
        }
        
        // Calculate delay for next attempt
        const delay = ErrorRecovery.getRetryDelay(transferError.code, attempt);
        console.warn(`Attempt ${attempt} failed: ${transferError.message}. Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  // Specialized retry methods for different error types
  async retryNetworkOperation<T>(operation: () => Promise<T>): Promise<T> {
    const networkConfig: RetryConfig = {
      maxAttempts: 5,
      initialDelay: 500,
      maxDelay: 10000,
      backoffMultiplier: 1.5,
      jitter: true,
    };

    const handler = new RetryHandler(networkConfig);
    return handler.retry(operation, (error, attempt) => {
      // More aggressive retries for network errors
      if (['NETWORK_ERROR', 'CONNECTION_REFUSED', 'TIMEOUT'].includes(error.code)) {
        return attempt <= networkConfig.maxAttempts;
      }
      return ErrorRecovery.shouldAutoRetry(error.code, attempt, networkConfig.maxAttempts);
    });
  }

  async retryChecksumOperation<T>(operation: () => Promise<T>): Promise<T> {
    const checksumConfig: RetryConfig = {
      maxAttempts: 2,
      initialDelay: 1000,
      maxDelay: 3000,
      backoffMultiplier: 1.0,
      jitter: false,
    };

    const handler = new RetryHandler(checksumConfig);
    return handler.retry(operation, (error, attempt) => {
      // Only retry once for checksum mismatches
      return error.code === 'CHECKSUM_MISMATCH' && attempt <= 1;
    });
  }
}

// Error notification system
export interface ErrorNotification {
  id: string;
  error: TransferError;
  dismissed: boolean;
  actions?: ErrorAction[];
}

export interface ErrorAction {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}

class ErrorNotificationManager {
  private notifications: Writable<ErrorNotification[]> = writable([]);
  private idCounter = 0;

  subscribe = this.notifications.subscribe;

  addError(error: TransferError, actions?: ErrorAction[]): string {
    const id = `error-${++this.idCounter}`;
    const notification: ErrorNotification = {
      id,
      error,
      dismissed: false,
      actions,
    };

    this.notifications.update(notifications => [...notifications, notification]);
    
    // Auto-dismiss after 10 seconds for non-critical errors
    if (error.recoverable) {
      setTimeout(() => {
        this.dismissError(id);
      }, 10000);
    }
    
    return id;
  }

  dismissError(id: string): void {
    this.notifications.update(notifications =>
      notifications.map(n => n.id === id ? { ...n, dismissed: true } : n)
    );
    
    // Remove dismissed notifications after animation
    setTimeout(() => {
      this.notifications.update(notifications =>
        notifications.filter(n => n.id !== id)
      );
    }, 300);
  }

  clearAll(): void {
    this.notifications.set([]);
  }

  getActiveNotifications(): ErrorNotification[] {
    let current: ErrorNotification[] = [];
    this.notifications.subscribe(notifications => {
      current = notifications.filter(n => !n.dismissed);
    })();
    return current;
  }
}

export const errorNotifications = new ErrorNotificationManager();

// Global error handler for unhandled promise rejections
export function setupGlobalErrorHandler(): void {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    const error = event.reason instanceof TransferError 
      ? event.reason 
      : TransferError.fromBackendError(event.reason);
    
    errorNotifications.addError(error);
    
    // Prevent the default browser error handling
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    const error = new TransferError(
      event.message || 'An unexpected error occurred',
      'UNKNOWN_ERROR',
      { context: `${event.filename}:${event.lineno}:${event.colno}` }
    );
    
    errorNotifications.addError(error);
  });
}

// Utility functions for error handling in components
export function handleAsyncError<T>(
  promise: Promise<T>,
  context?: ErrorContext
): Promise<T> {
  return promise.catch((error) => {
    const transferError = error instanceof TransferError 
      ? error 
      : TransferError.fromBackendError(error);
    
    // Add context if provided
    if (context) {
      Object.assign(transferError, {
        transferId: transferError.transferId || context.transferId,
        context: transferError.context || context.operation,
      });
    }
    
    errorNotifications.addError(transferError);
    throw transferError;
  });
}

export function createErrorActions(
  error: TransferError,
  retryFn?: () => void | Promise<void>,
  cancelFn?: () => void
): ErrorAction[] {
  const actions: ErrorAction[] = [];
  
  if (error.recoverable && retryFn) {
    actions.push({
      label: 'Retry',
      action: retryFn,
      primary: true,
    });
  }
  
  if (cancelFn) {
    actions.push({
      label: 'Cancel',
      action: cancelFn,
    });
  }
  
  return actions;
}