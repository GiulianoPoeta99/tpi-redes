// Notification store for managing in-app notifications
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  duration?: number; // Auto-dismiss after this many milliseconds
  persistent?: boolean; // Don't auto-dismiss
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

interface NotificationState {
  notifications: Notification[];
  maxNotifications: number;
}

function createNotificationStore() {
  const { subscribe, set, update } = writable<NotificationState>({
    notifications: [],
    maxNotifications: 5
  });

  return {
    subscribe,
    set,
    update,

    /**
     * Add a new notification
     */
    add(notification: Omit<Notification, 'id' | 'timestamp'>): string {
      const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNotification: Notification = {
        ...notification,
        id,
        timestamp: new Date(),
        duration: notification.duration ?? (notification.persistent ? undefined : 5000)
      };

      update(state => {
        const notifications = [newNotification, ...state.notifications]
          .slice(0, state.maxNotifications);
        
        return { ...state, notifications };
      });

      // Auto-dismiss if duration is set
      if (newNotification.duration && !newNotification.persistent) {
        setTimeout(() => {
          this.remove(id);
        }, newNotification.duration);
      }

      return id;
    },

    /**
     * Remove a notification by ID
     */
    remove(id: string): void {
      update(state => ({
        ...state,
        notifications: state.notifications.filter(n => n.id !== id)
      }));
    },

    /**
     * Clear all notifications
     */
    clear(): void {
      update(state => ({ ...state, notifications: [] }));
    },

    /**
     * Clear notifications of a specific type
     */
    clearByType(type: Notification['type']): void {
      update(state => ({
        ...state,
        notifications: state.notifications.filter(n => n.type !== type)
      }));
    },

    /**
     * Update max notifications limit
     */
    setMaxNotifications(max: number): void {
      update(state => ({
        ...state,
        maxNotifications: max,
        notifications: state.notifications.slice(0, max)
      }));
    },

    // Convenience methods for different notification types
    info(title: string, message: string, options?: Partial<Notification>): string {
      return this.add({ ...options, title, message, type: 'info' });
    },

    success(title: string, message: string, options?: Partial<Notification>): string {
      return this.add({ ...options, title, message, type: 'success' });
    },

    warning(title: string, message: string, options?: Partial<Notification>): string {
      return this.add({ ...options, title, message, type: 'warning' });
    },

    error(title: string, message: string, options?: Partial<Notification>): string {
      return this.add({ ...options, title, message, type: 'error', persistent: true });
    }
  };
}

export const notificationStore = createNotificationStore();

// Derived stores
export const notifications = derived(
  notificationStore,
  $store => $store.notifications
);

export const hasNotifications = derived(
  notifications,
  $notifications => $notifications.length > 0
);

export const errorNotifications = derived(
  notifications,
  $notifications => $notifications.filter(n => n.type === 'error')
);

export const hasErrors = derived(
  errorNotifications,
  $errors => $errors.length > 0
);

// Listen for custom notification events from the event integration service
if (browser) {
  window.addEventListener('transfer-notification', (event: CustomEvent) => {
    const { title, message, type } = event.detail;
    notificationStore.add({ title, message, type });
  });
}

// Notification utilities
export const notificationUtils = {
  /**
   * Show a transfer error notification with retry action
   */
  showTransferError(message: string, onRetry?: () => void): string {
    const actions: NotificationAction[] = [];
    
    if (onRetry) {
      actions.push({
        label: 'Retry',
        action: onRetry,
        style: 'primary'
      });
    }

    actions.push({
      label: 'Dismiss',
      action: () => {}, // Will be handled by the notification component
      style: 'secondary'
    });

    return notificationStore.error('Transfer Error', message, {
      actions,
      persistent: true
    });
  },

  /**
   * Show a transfer success notification
   */
  showTransferSuccess(filename: string, size: number): string {
    const sizeStr = formatBytes(size);
    return notificationStore.success(
      'Transfer Complete',
      `Successfully transferred ${filename} (${sizeStr})`
    );
  },

  /**
   * Show a connection status notification
   */
  showConnectionStatus(status: string, address: string, protocol: string): string {
    const messages = {
      connected: `Connected to ${address} via ${protocol}`,
      listening: `Listening on ${address} for ${protocol} connections`,
      disconnected: `Disconnected from ${address}`,
      connecting: `Connecting to ${address} via ${protocol}`
    };

    const message = messages[status as keyof typeof messages] || `${status}: ${address}`;
    
    return notificationStore.info('Connection Status', message);
  }
};

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}