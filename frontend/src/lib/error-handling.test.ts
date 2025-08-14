import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TransferError,
  ErrorRecovery,
  RetryHandler,
  errorNotifications,
  handleAsyncError,
  createErrorActions,
  setupGlobalErrorHandler,
  type RetryConfig,
} from './error-handling';

describe('TransferError', () => {
  it('should create error with all properties', () => {
    const error = new TransferError('Test message', 'TEST_ERROR', {
      transferId: 'test-123',
      recoverable: true,
      context: 'test context',
      recoverySuggestion: 'Try again',
    });

    expect(error.message).toBe('Test message');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.transferId).toBe('test-123');
    expect(error.recoverable).toBe(true);
    expect(error.context).toBe('test context');
    expect(error.recoverySuggestion).toBe('Try again');
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should create error from backend error object', () => {
    const backendError = {
      message: 'Network connection failed',
      code: 'NETWORK_ERROR',
      recoverable: true,
      context: '127.0.0.1:8080',
    };

    const error = TransferError.fromBackendError(backendError);

    expect(error.message).toBe('Network connection failed');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.recoverable).toBe(true);
    expect(error.context).toBe('127.0.0.1:8080');
    expect(error.recoverySuggestion).toBeDefined();
  });

  it('should handle string backend errors', () => {
    const error = TransferError.fromBackendError('Simple error message');

    expect(error.message).toBe('Simple error message');
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.recoverable).toBe(false);
  });

  it('should serialize to JSON correctly', () => {
    const error = new TransferError('Test error', 'TEST_CODE', {
      transferId: 'test-123',
      recoverable: true,
    });

    const json = error.toJSON();

    expect(json.name).toBe('TransferError');
    expect(json.message).toBe('Test error');
    expect(json.code).toBe('TEST_CODE');
    expect(json.transferId).toBe('test-123');
    expect(json.recoverable).toBe(true);
    expect(json.timestamp).toBeDefined();
  });
});

describe('ErrorRecovery', () => {
  it('should provide user-friendly messages for error codes', () => {
    expect(ErrorRecovery.getUserFriendlyMessage('NETWORK_ERROR')).toBe('Network connection failed');
    expect(ErrorRecovery.getUserFriendlyMessage('FILE_NOT_FOUND')).toBe('File not found');
    expect(ErrorRecovery.getUserFriendlyMessage('CHECKSUM_MISMATCH')).toBe('File integrity check failed');
    expect(ErrorRecovery.getUserFriendlyMessage('UNKNOWN_CODE')).toBe('An unexpected error occurred');
  });

  it('should provide recovery suggestions', () => {
    expect(ErrorRecovery.getRecoverySuggestion('NETWORK_ERROR')).toContain('network connection');
    expect(ErrorRecovery.getRecoverySuggestion('FILE_NOT_FOUND', 'test.txt')).toContain('test.txt');
    expect(ErrorRecovery.getRecoverySuggestion('CONNECTION_REFUSED', '127.0.0.1:8080')).toContain('127.0.0.1:8080');
  });

  it('should determine if errors are recoverable', () => {
    expect(ErrorRecovery.isRecoverable('NETWORK_ERROR')).toBe(true);
    expect(ErrorRecovery.isRecoverable('CONNECTION_REFUSED')).toBe(true);
    expect(ErrorRecovery.isRecoverable('CHECKSUM_MISMATCH')).toBe(true);
    expect(ErrorRecovery.isRecoverable('PERMISSION_DENIED')).toBe(false);
    expect(ErrorRecovery.isRecoverable('CONFIG_ERROR')).toBe(false);
  });

  it('should determine auto-retry eligibility', () => {
    expect(ErrorRecovery.shouldAutoRetry('NETWORK_ERROR', 1, 3)).toBe(true);
    expect(ErrorRecovery.shouldAutoRetry('NETWORK_ERROR', 3, 3)).toBe(false);
    expect(ErrorRecovery.shouldAutoRetry('PERMISSION_DENIED', 1, 3)).toBe(false);
    expect(ErrorRecovery.shouldAutoRetry('RATE_LIMIT_EXCEEDED', 2, 3)).toBe(true);
  });

  it('should calculate retry delays correctly', () => {
    // Test exponential backoff
    const delay1 = ErrorRecovery.getRetryDelay('NETWORK_ERROR', 1);
    const delay2 = ErrorRecovery.getRetryDelay('NETWORK_ERROR', 2);
    expect(delay2).toBeGreaterThan(delay1);

    // Test rate limit minimum delay
    const rateLimitDelay = ErrorRecovery.getRetryDelay('RATE_LIMIT_EXCEEDED', 1);
    expect(rateLimitDelay).toBeGreaterThanOrEqual(5000);

    // Test checksum mismatch minimum delay
    const checksumDelay = ErrorRecovery.getRetryDelay('CHECKSUM_MISMATCH', 1);
    expect(checksumDelay).toBeGreaterThanOrEqual(2000);
  });

  it('should provide timeout recommendations', () => {
    expect(ErrorRecovery.getTimeoutRecommendation('TIMEOUT', 'connect')).toContain('connection timeout');
    expect(ErrorRecovery.getTimeoutRecommendation('TIMEOUT', 'read')).toContain('read timeout');
    expect(ErrorRecovery.getTimeoutRecommendation('TIMEOUT', 'write')).toContain('write timeout');
    expect(ErrorRecovery.getTimeoutRecommendation('NETWORK_ERROR')).toContain('timeout');
    expect(ErrorRecovery.getTimeoutRecommendation('CONNECTION_REFUSED')).toContain('accessible');
  });
});

describe('RetryHandler', () => {
  let retryHandler: RetryHandler;
  const mockConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 10,
    maxDelay: 1000,
    backoffMultiplier: 2,
    jitter: false,
  };

  beforeEach(() => {
    retryHandler = new RetryHandler(mockConfig);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await retryHandler.retry(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry recoverable errors', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new TransferError('Network error', 'NETWORK_ERROR', { recoverable: true }))
      .mockRejectedValueOnce(new TransferError('Network error', 'NETWORK_ERROR', { recoverable: true }))
      .mockResolvedValue('success');

    const promise = retryHandler.retry(operation);

    // Fast-forward through retry delays
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry non-recoverable errors', async () => {
    const operation = vi.fn()
      .mockRejectedValue(new TransferError('Permission denied', 'PERMISSION_DENIED', { recoverable: false }));

    await expect(retryHandler.retry(operation)).rejects.toThrow('Permission denied');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should respect max attempts', async () => {
    const operation = vi.fn()
      .mockRejectedValue(new TransferError('Network error', 'NETWORK_ERROR', { recoverable: true }));

    const promise = retryHandler.retry(operation);
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Network error');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should use custom error handler', async () => {
    const operation = vi.fn()
      .mockRejectedValue(new TransferError('Test error', 'TEST_ERROR', { recoverable: true }));

    const customHandler = vi.fn().mockReturnValue(false); // Don't retry

    await expect(retryHandler.retry(operation, customHandler)).rejects.toThrow('Test error');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(customHandler).toHaveBeenCalledWith(expect.any(TransferError), 1);
  });

  it('should handle network operations with specialized config', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new TransferError('Connection refused', 'CONNECTION_REFUSED', { recoverable: true }))
      .mockResolvedValue('success');

    const promise = retryHandler.retryNetworkOperation(operation);
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should handle checksum operations with limited retries', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new TransferError('Checksum mismatch', 'CHECKSUM_MISMATCH', { recoverable: true }))
      .mockResolvedValue('success');

    const promise = retryHandler.retryChecksumOperation(operation);
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should provide progress updates', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new TransferError('Network error', 'NETWORK_ERROR', { recoverable: true }))
      .mockResolvedValue('success');

    const progressCallback = vi.fn();

    const promise = retryHandler.retryWithProgress(operation, progressCallback);
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(progressCallback).toHaveBeenCalledWith(1, 3, expect.any(TransferError));
  });
});

describe('Error Notifications', () => {
  beforeEach(() => {
    errorNotifications.clearAll();
  });

  it('should add error notifications', () => {
    const error = new TransferError('Test error', 'TEST_ERROR');
    const id = errorNotifications.addError(error);

    expect(id).toBeDefined();
    expect(errorNotifications.getActiveNotifications()).toHaveLength(1);
  });

  it('should dismiss error notifications', () => {
    const error = new TransferError('Test error', 'TEST_ERROR');
    const id = errorNotifications.addError(error);

    errorNotifications.dismissError(id);

    // Should be marked as dismissed immediately
    const notifications = errorNotifications.getActiveNotifications();
    expect(notifications.find(n => n.id === id)?.dismissed).toBe(true);
  });

  it('should auto-dismiss recoverable errors', () => {
    vi.useFakeTimers();

    const error = new TransferError('Recoverable error', 'NETWORK_ERROR', { recoverable: true });
    errorNotifications.addError(error);

    expect(errorNotifications.getActiveNotifications()).toHaveLength(1);

    // Fast-forward 10 seconds
    vi.advanceTimersByTime(10000);

    // Should be dismissed
    expect(errorNotifications.getActiveNotifications()[0]?.dismissed).toBe(true);

    vi.useRealTimers();
  });

  it('should not auto-dismiss non-recoverable errors', () => {
    vi.useFakeTimers();

    const error = new TransferError('Non-recoverable error', 'PERMISSION_DENIED', { recoverable: false });
    errorNotifications.addError(error);

    expect(errorNotifications.getActiveNotifications()).toHaveLength(1);

    // Fast-forward 10 seconds
    vi.advanceTimersByTime(10000);

    // Should still be active
    expect(errorNotifications.getActiveNotifications()[0]?.dismissed).toBeFalsy();

    vi.useRealTimers();
  });
});

describe('Utility Functions', () => {
  it('should handle async errors', async () => {
    const error = new Error('Test error');
    const failingPromise = Promise.reject(error);

    await expect(handleAsyncError(failingPromise)).rejects.toThrow();
  });

  it('should create error actions', () => {
    const retryFn = vi.fn();
    const cancelFn = vi.fn();
    const error = new TransferError('Test error', 'NETWORK_ERROR', { recoverable: true });

    const actions = createErrorActions(error, retryFn, cancelFn);

    expect(actions).toHaveLength(2);
    expect(actions[0].label).toBe('Retry');
    expect(actions[0].primary).toBe(true);
    expect(actions[1].label).toBe('Cancel');
  });

  it('should not create retry action for non-recoverable errors', () => {
    const retryFn = vi.fn();
    const cancelFn = vi.fn();
    const error = new TransferError('Test error', 'PERMISSION_DENIED', { recoverable: false });

    const actions = createErrorActions(error, retryFn, cancelFn);

    expect(actions).toHaveLength(1);
    expect(actions[0].label).toBe('Cancel');
  });
});

describe('Global Error Handler', () => {
  let originalOnError: ((this: GlobalEventHandlers, ev: ErrorEvent) => any) | null;
  let originalOnUnhandledRejection: ((this: WindowEventHandlers, ev: PromiseRejectionEvent) => any) | null;

  beforeEach(() => {
    originalOnError = window.onerror;
    originalOnUnhandledRejection = window.onunhandledrejection;
    errorNotifications.clearAll();
  });

  afterEach(() => {
    window.onerror = originalOnError;
    window.onunhandledrejection = originalOnUnhandledRejection;
  });

  it('should setup global error handlers', () => {
    setupGlobalErrorHandler();

    expect(window.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should handle unhandled promise rejections', () => {
    setupGlobalErrorHandler();

    const error = new TransferError('Unhandled error', 'TEST_ERROR');
    const event = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.reject(error),
      reason: error,
    });

    window.dispatchEvent(event);

    expect(errorNotifications.getActiveNotifications()).toHaveLength(1);
  });

  it('should handle global errors', () => {
    setupGlobalErrorHandler();

    const event = new ErrorEvent('error', {
      message: 'Global error',
      filename: 'test.js',
      lineno: 10,
      colno: 5,
    });

    window.dispatchEvent(event);

    expect(errorNotifications.getActiveNotifications()).toHaveLength(1);
    const notification = errorNotifications.getActiveNotifications()[0];
    expect(notification.error.message).toBe('Global error');
    expect(notification.error.context).toContain('test.js:10:5');
  });
});