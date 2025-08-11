import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import NotificationContainer from './NotificationContainer.svelte';

// Mock child components
vi.mock('./NotificationDisplay.svelte', () => ({
  default: vi.fn(() => ({ $$: { fragment: null } }))
}));

vi.mock('./TransferNotification.svelte', () => ({
  default: vi.fn(() => ({ $$: { fragment: null } }))
}));

// Mock system notifications service
const mockSystemNotifications = {
  show: vi.fn(),
  showTransferComplete: vi.fn(),
  showTransferError: vi.fn(),
  showConnectionStatus: vi.fn(),
  onFallback: vi.fn(() => () => {})
};

const mockNotificationStore = {
  add: vi.fn()
};

vi.mock('../services/system-notifications', () => ({
  systemNotifications: mockSystemNotifications,
  notificationSettings: {
    subscribe: vi.fn(() => () => {})
  }
}));

vi.mock('../stores/notifications', () => ({
  notificationStore: mockNotificationStore
}));

describe('NotificationContainer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset event listeners
    const eventListeners: { [key: string]: EventListener[] } = {};
    
    vi.spyOn(window, 'addEventListener').mockImplementation((event, listener) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(listener as EventListener);
    });
    
    vi.spyOn(window, 'removeEventListener').mockImplementation((event, listener) => {
      if (eventListeners[event]) {
        const index = eventListeners[event].indexOf(listener as EventListener);
        if (index > -1) {
          eventListeners[event].splice(index, 1);
        }
      }
    });
    
    // Mock dispatchEvent
    vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render notification container', () => {
    render(NotificationContainer);
    
    expect(screen.getByTestId('notification-container')).toBeInTheDocument();
    expect(screen.getByTestId('transfer-notifications')).toBeInTheDocument();
  });

  it('should set up event listeners on mount', () => {
    render(NotificationContainer);
    
    expect(window.addEventListener).toHaveBeenCalledWith('system-notification-clicked', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('system-notification-action', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('transfer-started', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('transfer-progress', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('transfer-completed', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('transfer-error', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('transfer-cancelled', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('transfer-connection', expect.any(Function));
  });

  it('should handle transfer started event', () => {
    render(NotificationContainer);
    
    const event = new CustomEvent('transfer-started', {
      detail: {
        transfer_id: 'test-123',
        filename: 'test.txt'
      }
    });
    
    window.dispatchEvent(event);
    
    expect(mockSystemNotifications.show).toHaveBeenCalledWith({
      title: 'Transfer Started',
      body: 'Starting transfer of test.txt',
      icon: 'info'
    });
  });

  it('should handle transfer completed event', () => {
    render(NotificationContainer);
    
    const event = new CustomEvent('transfer-completed', {
      detail: {
        transfer_id: 'test-123',
        filename: 'test.txt',
        bytes_transferred: 1024,
        duration: 30,
        checksum: 'abc123'
      }
    });
    
    window.dispatchEvent(event);
    
    expect(mockSystemNotifications.showTransferComplete).toHaveBeenCalledWith('test.txt', 1024, 30);
  });

  it('should handle transfer error event', () => {
    render(NotificationContainer);
    
    const event = new CustomEvent('transfer-error', {
      detail: {
        transfer_id: 'test-123',
        filename: 'test.txt',
        error: 'Network timeout'
      }
    });
    
    window.dispatchEvent(event);
    
    expect(mockSystemNotifications.showTransferError).toHaveBeenCalledWith('test.txt', 'Network timeout');
  });

  it('should handle transfer cancelled event', () => {
    render(NotificationContainer);
    
    const event = new CustomEvent('transfer-cancelled', {
      detail: {
        transfer_id: 'test-123',
        filename: 'test.txt'
      }
    });
    
    window.dispatchEvent(event);
    
    expect(mockSystemNotifications.show).toHaveBeenCalledWith({
      title: 'Transfer Cancelled',
      body: 'Transfer of test.txt was cancelled',
      icon: 'warning'
    });
  });

  it('should handle connection event', () => {
    render(NotificationContainer);
    
    const event = new CustomEvent('transfer-connection', {
      detail: {
        status: 'connected',
        address: '192.168.1.100:8080',
        protocol: 'TCP'
      }
    });
    
    window.dispatchEvent(event);
    
    expect(mockSystemNotifications.showConnectionStatus).toHaveBeenCalledWith('connected', '192.168.1.100:8080', 'TCP');
  });

  it('should handle system notification fallback', () => {
    let fallbackCallback: Function;
    
    mockSystemNotifications.onFallback.mockImplementation((callback) => {
      fallbackCallback = callback;
      return () => {};
    });
    
    render(NotificationContainer);
    
    // Trigger fallback
    const notificationOptions = {
      title: 'Test',
      body: 'Test notification',
      icon: 'info'
    };
    
    fallbackCallback!(notificationOptions);
    
    expect(mockNotificationStore.add).toHaveBeenCalledWith({
      title: 'Test',
      message: 'Test notification',
      type: 'info',
      actions: undefined
    });
  });

  it('should handle system notification with actions', () => {
    let fallbackCallback: Function;
    
    mockSystemNotifications.onFallback.mockImplementation((callback) => {
      fallbackCallback = callback;
      return () => {};
    });
    
    render(NotificationContainer);
    
    // Trigger fallback with actions
    const notificationOptions = {
      title: 'Transfer Failed',
      body: 'Failed to transfer file',
      icon: 'error',
      actions: [
        { id: 'retry', title: 'Retry' },
        { id: 'dismiss', title: 'Dismiss' }
      ]
    };
    
    fallbackCallback!(notificationOptions);
    
    expect(mockNotificationStore.add).toHaveBeenCalledWith({
      title: 'Transfer Failed',
      message: 'Failed to transfer file',
      type: 'error',
      actions: [
        {
          label: 'Retry',
          action: expect.any(Function),
          style: 'primary'
        },
        {
          label: 'Dismiss',
          action: expect.any(Function),
          style: 'secondary'
        }
      ]
    });
  });

  it('should handle notification actions', () => {
    render(NotificationContainer);
    
    const event = new CustomEvent('system-notification-action', {
      detail: {
        actionId: 'retry',
        notificationData: { filename: 'test.txt' }
      }
    });
    
    window.dispatchEvent(event);
    
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'retry-transfer',
        detail: { filename: 'test.txt' }
      })
    );
  });

  it('should not show system notifications when disabled', () => {
    render(NotificationContainer, { showSystemNotifications: false });
    
    const event = new CustomEvent('transfer-started', {
      detail: {
        transfer_id: 'test-123',
        filename: 'test.txt'
      }
    });
    
    window.dispatchEvent(event);
    
    expect(mockSystemNotifications.show).not.toHaveBeenCalled();
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = render(NotificationContainer);
    
    unmount();
    
    expect(window.removeEventListener).toHaveBeenCalledWith('system-notification-clicked', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('system-notification-action', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('transfer-started', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('transfer-progress', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('transfer-completed', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('transfer-error', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('transfer-cancelled', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('transfer-connection', expect.any(Function));
  });

  it('should map notification icons to types correctly', () => {
    let fallbackCallback: Function;
    
    mockSystemNotifications.onFallback.mockImplementation((callback) => {
      fallbackCallback = callback;
      return () => {};
    });
    
    render(NotificationContainer);
    
    // Test different icon mappings
    const testCases = [
      { icon: 'success', expectedType: 'success' },
      { icon: 'error', expectedType: 'error' },
      { icon: 'warning', expectedType: 'warning' },
      { icon: 'info', expectedType: 'info' },
      { icon: undefined, expectedType: 'info' }
    ];
    
    testCases.forEach(({ icon, expectedType }) => {
      mockNotificationStore.add.mockClear();
      
      fallbackCallback!({
        title: 'Test',
        body: 'Test notification',
        icon
      });
      
      expect(mockNotificationStore.add).toHaveBeenCalledWith({
        title: 'Test',
        message: 'Test notification',
        type: expectedType,
        actions: undefined
      });
    });
  });

  it('should map action IDs to styles correctly', () => {
    let fallbackCallback: Function;
    
    mockSystemNotifications.onFallback.mockImplementation((callback) => {
      fallbackCallback = callback;
      return () => {};
    });
    
    render(NotificationContainer);
    
    const notificationOptions = {
      title: 'Test',
      body: 'Test notification',
      actions: [
        { id: 'retry', title: 'Retry' },
        { id: 'view', title: 'View' },
        { id: 'dismiss', title: 'Dismiss' },
        { id: 'unknown', title: 'Unknown' }
      ]
    };
    
    fallbackCallback!(notificationOptions);
    
    const addCall = mockNotificationStore.add.mock.calls[0][0];
    expect(addCall.actions).toEqual([
      { label: 'Retry', action: expect.any(Function), style: 'primary' },
      { label: 'View', action: expect.any(Function), style: 'primary' },
      { label: 'Dismiss', action: expect.any(Function), style: 'secondary' },
      { label: 'Unknown', action: expect.any(Function), style: 'secondary' }
    ]);
  });
});