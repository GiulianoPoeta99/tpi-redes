// Tests for NotificationDisplay component
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';
import NotificationDisplay from './NotificationDisplay.svelte';
import { notificationStore } from '../stores/notifications';
import type { Notification } from '../stores/notifications';

describe('NotificationDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationStore.clear();
  });

  it('should render empty container when no notifications', () => {
    const { container } = render(NotificationDisplay);
    const notificationContainer = container.querySelector('[data-testid="notification-container"]');
    
    expect(notificationContainer).toBeTruthy();
    expect(notificationContainer?.children).toHaveLength(0);
  });

  it('should render notifications when added to store', () => {
    const { container } = render(NotificationDisplay);
    
    // Add a notification
    notificationStore.add({
      title: 'Test Notification',
      message: 'This is a test message',
      type: 'info'
    });

    const notifications = container.querySelectorAll('[data-testid="notification"]');
    expect(notifications).toHaveLength(1);
    
    const notification = notifications[0];
    expect(notification.textContent).toContain('Test Notification');
    expect(notification.textContent).toContain('This is a test message');
    expect(notification.getAttribute('data-type')).toBe('info');
  });

  it('should render multiple notifications', () => {
    const { container } = render(NotificationDisplay);
    
    // Add multiple notifications
    notificationStore.add({
      title: 'First Notification',
      message: 'First message',
      type: 'info'
    });
    
    notificationStore.add({
      title: 'Second Notification',
      message: 'Second message',
      type: 'success'
    });

    const notifications = container.querySelectorAll('[data-testid="notification"]');
    expect(notifications).toHaveLength(2);
  });

  it('should display correct icons for different notification types', () => {
    const { container } = render(NotificationDisplay);
    
    const testCases = [
      { type: 'info' as const, expectedIcon: 'ℹ️' },
      { type: 'success' as const, expectedIcon: '✅' },
      { type: 'warning' as const, expectedIcon: '⚠️' },
      { type: 'error' as const, expectedIcon: '❌' }
    ];

    testCases.forEach(({ type, expectedIcon }) => {
      notificationStore.add({
        title: `${type} notification`,
        message: `${type} message`,
        type
      });
    });

    const notifications = container.querySelectorAll('[data-testid="notification"]');
    expect(notifications).toHaveLength(4);

    testCases.forEach(({ expectedIcon }, index) => {
      const icon = notifications[index].querySelector('.notification-icon');
      expect(icon?.textContent).toBe(expectedIcon);
    });
  });

  it('should apply correct CSS classes for different notification types', () => {
    const { container } = render(NotificationDisplay);
    
    const testCases = [
      { type: 'info' as const, expectedClass: 'notification-info' },
      { type: 'success' as const, expectedClass: 'notification-success' },
      { type: 'warning' as const, expectedClass: 'notification-warning' },
      { type: 'error' as const, expectedClass: 'notification-error' }
    ];

    testCases.forEach(({ type }) => {
      notificationStore.add({
        title: `${type} notification`,
        message: `${type} message`,
        type
      });
    });

    const notifications = container.querySelectorAll('[data-testid="notification"]');
    
    testCases.forEach(({ expectedClass }, index) => {
      expect(notifications[index]).toHaveClass(expectedClass);
    });
  });

  it('should dismiss notification when close button is clicked', async () => {
    const { container } = render(NotificationDisplay);
    
    const notificationId = notificationStore.add({
      title: 'Test Notification',
      message: 'This should be dismissible',
      type: 'info'
    });

    // Should have one notification
    expect(container.querySelectorAll('[data-testid="notification"]')).toHaveLength(1);

    // Click dismiss button
    const dismissButton = container.querySelector('[data-testid="dismiss-button"]');
    expect(dismissButton).toBeTruthy();
    
    await fireEvent.click(dismissButton!);

    // Should have no notifications
    expect(container.querySelectorAll('[data-testid="notification"]')).toHaveLength(0);
    
    // Store should be empty
    const storeState = get(notificationStore);
    expect(storeState.notifications).toHaveLength(0);
  });

  it('should render notification actions when provided', () => {
    const { container } = render(NotificationDisplay);
    
    const mockAction = vi.fn();
    
    notificationStore.add({
      title: 'Action Notification',
      message: 'This has actions',
      type: 'error',
      actions: [
        {
          label: 'Retry',
          action: mockAction,
          style: 'primary'
        },
        {
          label: 'Cancel',
          action: vi.fn(),
          style: 'secondary'
        }
      ]
    });

    const actionButtons = container.querySelectorAll('[data-testid="notification-action"]');
    expect(actionButtons).toHaveLength(2);
    
    expect(actionButtons[0].textContent).toBe('Retry');
    expect(actionButtons[1].textContent).toBe('Cancel');
    
    // Check CSS classes
    expect(actionButtons[0]).toHaveClass('notification-action-primary');
    expect(actionButtons[1]).toHaveClass('notification-action-secondary');
  });

  it('should execute action when action button is clicked', async () => {
    const { container } = render(NotificationDisplay);
    
    const mockAction = vi.fn();
    
    notificationStore.add({
      title: 'Action Notification',
      message: 'This has actions',
      type: 'info',
      actions: [
        {
          label: 'Test Action',
          action: mockAction,
          style: 'primary'
        }
      ]
    });

    const actionButton = container.querySelector('[data-testid="notification-action"]');
    expect(actionButton).toBeTruthy();
    
    await fireEvent.click(actionButton!);
    
    expect(mockAction).toHaveBeenCalledOnce();
  });

  it('should dismiss non-persistent notification after action', async () => {
    const { container } = render(NotificationDisplay);
    
    notificationStore.add({
      title: 'Action Notification',
      message: 'This should dismiss after action',
      type: 'info',
      persistent: false,
      actions: [
        {
          label: 'Test Action',
          action: vi.fn(),
          style: 'primary'
        }
      ]
    });

    // Should have notification
    expect(container.querySelectorAll('[data-testid="notification"]')).toHaveLength(1);

    const actionButton = container.querySelector('[data-testid="notification-action"]');
    await fireEvent.click(actionButton!);
    
    // Should dismiss notification
    expect(container.querySelectorAll('[data-testid="notification"]')).toHaveLength(0);
  });

  it('should not dismiss persistent notification after action', async () => {
    const { container } = render(NotificationDisplay);
    
    notificationStore.add({
      title: 'Persistent Notification',
      message: 'This should not dismiss after action',
      type: 'error',
      persistent: true,
      actions: [
        {
          label: 'Test Action',
          action: vi.fn(),
          style: 'primary'
        }
      ]
    });

    // Should have notification
    expect(container.querySelectorAll('[data-testid="notification"]')).toHaveLength(1);

    const actionButton = container.querySelector('[data-testid="notification-action"]');
    await fireEvent.click(actionButton!);
    
    // Should still have notification
    expect(container.querySelectorAll('[data-testid="notification"]')).toHaveLength(1);
  });

  it('should format timestamp correctly', () => {
    const { container } = render(NotificationDisplay);
    
    const testDate = new Date('2024-01-15T14:30:00');
    
    // Mock the notification with a specific timestamp
    const notification: Notification = {
      id: 'test-id',
      title: 'Test Notification',
      message: 'Test message',
      type: 'info',
      timestamp: testDate
    };

    // Manually add to store to control timestamp
    notificationStore.update(state => ({
      ...state,
      notifications: [notification]
    }));

    const timeElement = container.querySelector('.notification-time');
    expect(timeElement).toBeTruthy();
    
    // Should format as HH:MM
    const expectedTime = testDate.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    expect(timeElement?.textContent).toBe(expectedTime);
  });

  it('should handle notifications with no actions gracefully', () => {
    const { container } = render(NotificationDisplay);
    
    notificationStore.add({
      title: 'Simple Notification',
      message: 'No actions here',
      type: 'info'
    });

    const notification = container.querySelector('[data-testid="notification"]');
    expect(notification).toBeTruthy();
    
    const actionsContainer = notification?.querySelector('.notification-actions');
    expect(actionsContainer).toBeFalsy();
  });

  it('should handle empty actions array', () => {
    const { container } = render(NotificationDisplay);
    
    notificationStore.add({
      title: 'Empty Actions',
      message: 'Empty actions array',
      type: 'info',
      actions: []
    });

    const notification = container.querySelector('[data-testid="notification"]');
    expect(notification).toBeTruthy();
    
    const actionsContainer = notification?.querySelector('.notification-actions');
    expect(actionsContainer).toBeFalsy();
  });

  it('should update when notifications are added/removed from store', () => {
    const { container } = render(NotificationDisplay);
    
    // Initially empty
    expect(container.querySelectorAll('[data-testid="notification"]')).toHaveLength(0);
    
    // Add notification
    const id1 = notificationStore.add({
      title: 'First',
      message: 'First message',
      type: 'info'
    });
    
    expect(container.querySelectorAll('[data-testid="notification"]')).toHaveLength(1);
    
    // Add another
    const id2 = notificationStore.add({
      title: 'Second',
      message: 'Second message',
      type: 'success'
    });
    
    expect(container.querySelectorAll('[data-testid="notification"]')).toHaveLength(2);
    
    // Remove one
    notificationStore.remove(id1);
    
    expect(container.querySelectorAll('[data-testid="notification"]')).toHaveLength(1);
    
    // Clear all
    notificationStore.clear();
    
    expect(container.querySelectorAll('[data-testid="notification"]')).toHaveLength(0);
  });

  it('should handle action with default style', () => {
    const { container } = render(NotificationDisplay);
    
    notificationStore.add({
      title: 'Default Style Action',
      message: 'Action with default style',
      type: 'info',
      actions: [
        {
          label: 'Default Action',
          action: vi.fn()
          // No style specified, should default to 'secondary'
        }
      ]
    });

    const actionButton = container.querySelector('[data-testid="notification-action"]');
    expect(actionButton).toHaveClass('notification-action-secondary');
  });
});