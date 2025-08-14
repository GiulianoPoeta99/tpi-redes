import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import ErrorRecoveryDialog from './ErrorRecoveryDialog.svelte';
import { TransferError } from '../error-handling';

describe('ErrorRecoveryDialog', () => {
  let mockError: TransferError;

  beforeEach(() => {
    mockError = new TransferError('Network connection failed', 'NETWORK_ERROR', {
      recoverable: true,
      context: '127.0.0.1:8080',
      recoverySuggestion: 'Check your network connection and try again',
    });
  });

  it('should render error dialog when visible', () => {
    render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Network connection problem')).toBeInTheDocument();
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    expect(screen.getByText('Error Code: NETWORK_ERROR')).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: false,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should display recovery suggestion', () => {
    render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    expect(screen.getByText(/Check your network connection/)).toBeInTheDocument();
  });

  it('should display context information', () => {
    render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    expect(screen.getByText('Context: 127.0.0.1:8080')).toBeInTheDocument();
  });

  it('should show retry progress', () => {
    render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 2,
        maxRetries: 3,
      },
    });

    expect(screen.getByText('Retry attempt: 2 of 3')).toBeInTheDocument();
  });

  it('should emit retry event when retry button clicked', async () => {
    const { component } = render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    const retryHandler = vi.fn();
    component.$on('retry', retryHandler);

    const retryButton = screen.getByText('Retry');
    await fireEvent.click(retryButton);

    expect(retryHandler).toHaveBeenCalled();
  });

  it('should emit cancel event when cancel button clicked', async () => {
    const { component } = render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    const cancelHandler = vi.fn();
    component.$on('cancel', cancelHandler);

    const cancelButton = screen.getByText('Cancel');
    await fireEvent.click(cancelButton);

    expect(cancelHandler).toHaveBeenCalled();
  });

  it('should emit close event when close button clicked', async () => {
    const { component } = render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    const closeHandler = vi.fn();
    component.$on('close', closeHandler);

    const closeButton = screen.getByLabelText('Close dialog');
    await fireEvent.click(closeButton);

    expect(closeHandler).toHaveBeenCalled();
  });

  it('should disable retry button when max retries reached', () => {
    render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 3,
        maxRetries: 3,
      },
    });

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('should not show retry button for non-recoverable errors', () => {
    const nonRecoverableError = new TransferError('Permission denied', 'PERMISSION_DENIED', {
      recoverable: false,
    });

    render(ErrorRecoveryDialog, {
      props: {
        error: nonRecoverableError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('should show timeout configuration for timeout errors', () => {
    const timeoutError = new TransferError('Operation timed out', 'TIMEOUT', {
      recoverable: true,
      context: 'connect',
    });

    render(ErrorRecoveryDialog, {
      props: {
        error: timeoutError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    expect(screen.getByText('Adjust timeout settings')).toBeInTheDocument();
  });

  it('should show settings button for network errors', () => {
    render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should emit configure event when settings button clicked', async () => {
    const { component } = render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    const configureHandler = vi.fn();
    component.$on('configure', configureHandler);

    const settingsButton = screen.getByText('Settings');
    await fireEvent.click(settingsButton);

    expect(configureHandler).toHaveBeenCalled();
  });

  it('should display appropriate error icon', () => {
    const { container } = render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    const icon = container.querySelector('.error-icon');
    expect(icon?.textContent).toBe('🌐'); // Network error icon
  });

  it('should apply correct severity class', () => {
    const { container } = render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    const dialog = container.querySelector('.error-dialog');
    expect(dialog).toHaveClass('warning'); // Network errors are warnings
  });

  it('should handle checksum mismatch errors', () => {
    const checksumError = new TransferError('File integrity check failed', 'CHECKSUM_MISMATCH', {
      recoverable: true,
      context: 'test.txt',
    });

    const { container } = render(ErrorRecoveryDialog, {
      props: {
        error: checksumError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    expect(screen.getByText('File integrity check failed')).toBeInTheDocument();
    
    const dialog = container.querySelector('.error-dialog');
    expect(dialog).toHaveClass('error'); // Checksum errors are errors
    
    const icon = container.querySelector('.error-icon');
    expect(icon?.textContent).toBe('⚠️'); // Checksum error icon
  });

  it('should handle cancelled transfers', () => {
    const cancelledError = new TransferError('Transfer was cancelled', 'CANCELLED', {
      recoverable: false,
    });

    const { container } = render(ErrorRecoveryDialog, {
      props: {
        error: cancelledError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    expect(screen.getByText('Transfer cancelled')).toBeInTheDocument();
    
    const dialog = container.querySelector('.error-dialog');
    expect(dialog).toHaveClass('info'); // Cancelled transfers are info
    
    const icon = container.querySelector('.error-icon');
    expect(icon?.textContent).toBe('⏹️'); // Cancelled icon
  });

  it('should show recovery options for recoverable errors', () => {
    render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    expect(screen.getByText('Recovery Options:')).toBeInTheDocument();
    expect(screen.getByText('Retry immediately')).toBeInTheDocument();
    expect(screen.getByText('Retry with delay')).toBeInTheDocument();
    expect(screen.getByText('Enable automatic retries for similar errors')).toBeInTheDocument();
  });

  it('should close dialog when overlay is clicked', async () => {
    const { component } = render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    const closeHandler = vi.fn();
    component.$on('close', closeHandler);

    const overlay = screen.getByRole('dialog').parentElement;
    await fireEvent.click(overlay!);

    expect(closeHandler).toHaveBeenCalled();
  });

  it('should not close dialog when dialog content is clicked', async () => {
    const { component } = render(ErrorRecoveryDialog, {
      props: {
        error: mockError,
        visible: true,
        retryCount: 0,
        maxRetries: 3,
      },
    });

    const closeHandler = vi.fn();
    component.$on('close', closeHandler);

    const dialog = screen.getByRole('dialog');
    await fireEvent.click(dialog);

    expect(closeHandler).not.toHaveBeenCalled();
  });
});