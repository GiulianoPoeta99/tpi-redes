// Tests for notification store functionality
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { notificationStore, notifications, hasNotifications, errorNotifications, hasErrors } from './notifications';

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: true
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Notification Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationStore.clear();
    notificationStore.setMaxNotifications(5); // Reset to default
  });

  describe('Basic Operations', () => {
    it('should start with empty notifications', () => {
      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(0);
    });

    it('should add notifications', () => {
      const id = notificationStore.add({
        title: 'Test Notification',
        message: 'Test message',
        type: 'info'
      });

      expect(id).toBeDefined();
      
      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].title).toBe('Test Notification');
      expect(state.notifications[0].message).toBe('Test message');
      expect(state.notifications[0].type).toBe('info');
      expect(state.notifications[0].id).toBe(id);
      expect(state.notifications[0].timestamp).toBeInstanceOf(Date);
    });

    it('should remove notifications by ID', () => {
      const id = notificationStore.add({
        title: 'Test Notification',
        message: 'Test message',
        type: 'info'
      });

      // Should have notification
      expect(get(notificationStore).notifications).toHaveLength(1);

      notificationStore.remove(id);

      // Should be empty
      expect(get(notificationStore).notifications).toHaveLength(0);
    });

    it('should clear all notifications', () => {
      notificationStore.add({
        title: 'First',
        message: 'First message',
        type: 'info'
      });

      notificationStore.add({
        title: 'Second',
        message: 'Second message',
        type: 'success'
      });

      // Should have two notifications
      expect(get(notificationStore).notifications).toHaveLength(2);

      notificationStore.clear();

      // Should be empty
      expect(get(notificationStore).notifications).toHaveLength(0);
    });
  });

  describe('Notification Types', () => {
    it('should add info notifications', () => {
      const id = notificationStore.info('Info Title', 'Info message');
      
      const state = get(notificationStore);
      expect(state.notifications[0].type).toBe('info');
      expect(state.notifications[0].title).toBe('Info Title');
      expect(state.notifications[0].message).toBe('Info message');
    });

    it('should add success notifications', () => {
      const id = notificationStore.success('Success Title', 'Success message');
      
      const state = get(notificationStore);
      expect(state.notifications[0].type).toBe('success');
      expect(state.notifications[0].title).toBe('Success Title');
      expect(state.notifications[0].message).toBe('Success message');
    });

    it('should add warning notifications', () => {
      const id = notificationStore.warning('Warning Title', 'Warning message');
      
      const state = get(notificationStore);
      expect(state.notifications[0].type).toBe('warning');
      expect(state.notifications[0].title).toBe('Warning Title');
      expect(state.notifications[0].message).toBe('Warning message');
    });

    it('should add error notifications as persistent by default', () => {
      const id = notificationStore.error('Error Title', 'Error message');
      
      const state = get(notificationStore);
      expect(state.notifications[0].type).toBe('error');
      expect(state.notifications[0].title).toBe('Error Title');
      expect(state.notifications[0].message).toBe('Error message');
      expect(state.notifications[0].persistent).toBe(true);
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-dismiss notifications after duration', () => {
      vi.useFakeTimers();

      const id = notificationStore.add({
        title: 'Auto-dismiss',
        message: 'This should auto-dismiss',
        type: 'info',
        duration: 1000
      });

      // Should have notification
      expect(get(notificationStore).notifications).toHaveLength(1);

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      // Should auto-dismiss
      expect(get(notificationStore).notifications).toHaveLength(0);

      vi.useRealTimers();
    });

    it('should not auto-dismiss persistent notifications', () => {
      vi.useFakeTimers();

      const id = notificationStore.add({
        title: 'Persistent',
        message: 'This should not auto-dismiss',
        type: 'error',
        persistent: true,
        duration: 1000
      });

      // Should have notification
      expect(get(notificationStore).notifications).toHaveLength(1);

      // Fast-forward time
      vi.advanceTimersByTime(5000);

      // Should still have notification
      expect(get(notificationStore).notifications).toHaveLength(1);

      vi.useRealTimers();
    });

    it('should use default duration when not specified', () => {
      vi.useFakeTimers();

      const id = notificationStore.add({
        title: 'Default Duration',
        message: 'Uses default 5s duration',
        type: 'info'
      });

      // Should have notification
      expect(get(notificationStore).notifications).toHaveLength(1);

      // Fast-forward to just before default duration (5000ms)
      vi.advanceTimersByTime(4999);
      expect(get(notificationStore).notifications).toHaveLength(1);

      // Fast-forward past default duration
      vi.advanceTimersByTime(1);
      expect(get(notificationStore).notifications).toHaveLength(0);

      vi.useRealTimers();
    });
  });

  describe('Max Notifications Limit', () => {
    it('should respect max notifications limit', () => {
      // Set max to 3
      notificationStore.setMaxNotifications(3);

      // Add 5 notifications
      for (let i = 0; i < 5; i++) {
        notificationStore.add({
          title: `Notification ${i}`,
          message: `Message ${i}`,
          type: 'info'
        });
      }

      // Should only have 3 (the most recent ones)
      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(3);
      expect(state.maxNotifications).toBe(3);
      
      // Should have the most recent notifications (4, 3, 2)
      expect(state.notifications[0].title).toBe('Notification 4');
      expect(state.notifications[1].title).toBe('Notification 3');
      expect(state.notifications[2].title).toBe('Notification 2');
    });
  });

  describe('Clear by Type', () => {
    it('should clear notifications by type', () => {
      // Add notifications with persistent flag to prevent auto-dismiss
      notificationStore.add({
        title: 'Info 1',
        message: 'Info message 1',
        type: 'info',
        persistent: true
      });
      
      notificationStore.add({
        title: 'Error 1',
        message: 'Error message 1',
        type: 'error',
        persistent: true
      });
      
      notificationStore.add({
        title: 'Info 2',
        message: 'Info message 2',
        type: 'info',
        persistent: true
      });
      
      notificationStore.add({
        title: 'Success 1',
        message: 'Success message 1',
        type: 'success',
        persistent: true
      });

      // Should have 4 notifications
      expect(get(notificationStore).notifications).toHaveLength(4);

      // Clear info notifications
      notificationStore.clearByType('info');

      // Should have 2 notifications (error and success)
      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(2);
      expect(state.notifications.some(n => n.type === 'info')).toBe(false);
      expect(state.notifications.some(n => n.type === 'error')).toBe(true);
      expect(state.notifications.some(n => n.type === 'success')).toBe(true);
    });
  });

  describe('Actions', () => {
    it('should include actions in notifications', () => {
      const mockAction = vi.fn();
      
      const id = notificationStore.add({
        title: 'Action Notification',
        message: 'Has actions',
        type: 'info',
        actions: [
          {
            label: 'Test Action',
            action: mockAction,
            style: 'primary'
          }
        ]
      });

      const state = get(notificationStore);
      expect(state.notifications[0].actions).toHaveLength(1);
      expect(state.notifications[0].actions![0].label).toBe('Test Action');
      expect(state.notifications[0].actions![0].style).toBe('primary');
      expect(typeof state.notifications[0].actions![0].action).toBe('function');
    });
  });

  describe('Derived Stores', () => {
    it('should provide notifications derived store', () => {
      notificationStore.add({
        title: 'Test',
        message: 'Test message',
        type: 'info'
      });

      const notificationsList = get(notifications);
      expect(notificationsList).toHaveLength(1);
      expect(notificationsList[0].title).toBe('Test');
    });

    it('should provide hasNotifications derived store', () => {
      // Initially false
      expect(get(hasNotifications)).toBe(false);

      // Add notification
      notificationStore.add({
        title: 'Test',
        message: 'Test message',
        type: 'info'
      });

      // Should be true
      expect(get(hasNotifications)).toBe(true);

      // Clear notifications
      notificationStore.clear();

      // Should be false again
      expect(get(hasNotifications)).toBe(false);
    });

    it('should provide errorNotifications derived store', () => {
      notificationStore.info('Info', 'Info message');
      notificationStore.error('Error 1', 'Error message 1');
      notificationStore.success('Success', 'Success message');
      notificationStore.error('Error 2', 'Error message 2');

      const errors = get(errorNotifications);
      expect(errors).toHaveLength(2);
      expect(errors.every(n => n.type === 'error')).toBe(true);
    });

    it('should provide hasErrors derived store', () => {
      // Initially false
      expect(get(hasErrors)).toBe(false);

      // Add non-error notification
      notificationStore.info('Info', 'Info message');
      expect(get(hasErrors)).toBe(false);

      // Add error notification
      notificationStore.error('Error', 'Error message');
      expect(get(hasErrors)).toBe(true);

      // Clear errors
      notificationStore.clearByType('error');
      expect(get(hasErrors)).toBe(false);
    });
  });

  describe('Custom Event Listener', () => {
    it('should listen for transfer-notification events', () => {
      const event = new CustomEvent('transfer-notification', {
        detail: {
          title: 'Transfer Event',
          message: 'Transfer message',
          type: 'success'
        }
      });

      window.dispatchEvent(event);

      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].title).toBe('Transfer Event');
      expect(state.notifications[0].message).toBe('Transfer message');
      expect(state.notifications[0].type).toBe('success');
    });
  });
});