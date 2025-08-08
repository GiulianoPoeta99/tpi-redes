<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { listen, type UnlistenFn } from '@tauri-apps/api/event';
  import TransferNotification from './TransferNotification.svelte';
  import type { TransferStatus } from '../types';

  // Props
  export let maxNotifications: number = 5;
  export let position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right';
  export let enableSystemNotifications: boolean = true;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    notificationClick: { transferId: string; status: TransferStatus };
  }>();

  // Notification interface
  interface NotificationData {
    id: string;
    transferId: string;
    status: TransferStatus;
    filename: string;
    error?: string;
    duration?: number;
    timestamp: number;
  }

  // Local state
  let notifications: NotificationData[] = [];
  let unlistenFunctions: UnlistenFn[] = [];

  // Reactive statements
  $: containerClass = getContainerClass(position);
  $: visibleNotifications = notifications.slice(0, maxNotifications);

  function getContainerClass(position: string): string {
    const baseClass = 'notification-container';
    switch (position) {
      case 'top-left': return `${baseClass} top-left`;
      case 'bottom-right': return `${baseClass} bottom-right`;
      case 'bottom-left': return `${baseClass} bottom-left`;
      default: return `${baseClass} top-right`;
    }
  }

  function addNotification(data: Omit<NotificationData, 'id' | 'timestamp'>) {
    const notification: NotificationData = {
      ...data,
      id: `${data.transferId}-${Date.now()}`,
      timestamp: Date.now()
    };

    // Add to the beginning of the array (newest first)
    notifications = [notification, ...notifications];

    // Remove excess notifications
    if (notifications.length > maxNotifications * 2) {
      notifications = notifications.slice(0, maxNotifications * 2);
    }

    // Show system notification if enabled
    if (enableSystemNotifications) {
      showSystemNotification(notification);
    }
  }

  function removeNotification(notificationId: string) {
    notifications = notifications.filter(n => n.id !== notificationId);
  }

  function handleNotificationClose(event: CustomEvent<{ transferId: string }>) {
    const notificationId = event.detail.transferId;
    // Find notification by transfer ID (since the event uses transferId, not notification id)
    const notification = notifications.find(n => n.transferId === notificationId);
    if (notification) {
      removeNotification(notification.id);
    }
  }

  function handleNotificationClick(event: CustomEvent<{ transferId: string }>) {
    const transferId = event.detail.transferId;
    const notification = notifications.find(n => n.transferId === transferId);
    if (notification) {
      dispatch('notificationClick', { 
        transferId, 
        status: notification.status 
      });
    }
  }

  async function showSystemNotification(notification: NotificationData) {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      return;
    }

    // Request permission if not already granted
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // Show notification if permission is granted
    if (Notification.permission === 'granted') {
      const title = getNotificationTitle(notification.status);
      const body = getNotificationMessage(notification);
      const icon = getNotificationIcon(notification.status);

      const systemNotification = new Notification(title, {
        body,
        icon,
        tag: notification.transferId, // Prevent duplicate notifications
        requireInteraction: notification.status === 'Error', // Keep error notifications visible
      });

      // Handle notification click
      systemNotification.onclick = () => {
        window.focus(); // Bring app to foreground
        dispatch('notificationClick', { 
          transferId: notification.transferId, 
          status: notification.status 
        });
        systemNotification.close();
      };

      // Auto-close after 5 seconds for non-error notifications
      if (notification.status !== 'Error') {
        setTimeout(() => {
          systemNotification.close();
        }, 5000);
      }
    }
  }

  function getNotificationTitle(status: TransferStatus): string {
    switch (status) {
      case 'Completed': return 'Transfer Completed';
      case 'Error': return 'Transfer Failed';
      case 'Cancelled': return 'Transfer Cancelled';
      default: return 'Transfer Update';
    }
  }

  function getNotificationMessage(notification: NotificationData): string {
    const fileText = notification.filename ? `"${notification.filename}"` : 'File';
    
    switch (notification.status) {
      case 'Completed':
        return `${fileText} transferred successfully`;
      case 'Error':
        return `${fileText} transfer failed${notification.error ? `: ${notification.error}` : ''}`;
      case 'Cancelled':
        return `${fileText} transfer was cancelled`;
      default:
        return `${fileText} transfer status updated`;
    }
  }

  function getNotificationIcon(status: TransferStatus): string {
    // Return a data URL for a simple icon or path to icon file
    // For now, we'll use a simple colored circle
    switch (status) {
      case 'Completed': return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2310b981"><circle cx="12" cy="12" r="10"/><path fill="white" d="m9 12 2 2 4-4"/></svg>';
      case 'Error': return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ef4444"><circle cx="12" cy="12" r="10"/><path fill="white" d="M15 9l-6 6m0-6l6 6"/></svg>';
      case 'Cancelled': return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f59e0b"><circle cx="12" cy="12" r="10"/><path fill="white" d="M8 12h8"/></svg>';
      default: return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233b82f6"><circle cx="12" cy="12" r="10"/><path fill="white" d="M12 8v4m0 4h.01"/></svg>';
    }
  }

  // Event listeners for Tauri events
  onMount(async () => {
    try {
      // Listen for transfer completion events
      const unlistenCompleted = await listen('transfer-completed', (event: any) => {
        addNotification({
          transferId: event.payload.transfer_id,
          status: 'Completed',
          filename: event.payload.filename || '',
          duration: event.payload.duration || 0
        });
      });

      // Listen for transfer error events
      const unlistenError = await listen('transfer-error', (event: any) => {
        addNotification({
          transferId: event.payload.transfer_id,
          status: 'Error',
          filename: event.payload.filename || '',
          error: event.payload.error || 'Unknown error'
        });
      });

      // Listen for transfer cancelled events
      const unlistenCancelled = await listen('transfer-cancelled', (event: any) => {
        addNotification({
          transferId: event.payload.transfer_id,
          status: 'Cancelled',
          filename: event.payload.filename || ''
        });
      });

      unlistenFunctions = [unlistenCompleted, unlistenError, unlistenCancelled];
    } catch (error) {
      console.error('Failed to set up event listeners:', error);
    }
  });

  onDestroy(() => {
    // Clean up event listeners
    unlistenFunctions.forEach(unlisten => {
      try {
        unlisten();
      } catch (error) {
        console.error('Failed to unlisten:', error);
      }
    });
  });

  // Public methods for manual notification management
  export function showNotification(
    transferId: string, 
    status: TransferStatus, 
    filename: string = '', 
    error?: string, 
    duration?: number
  ) {
    addNotification({ transferId, status, filename, error, duration });
  }

  export function clearNotifications() {
    notifications = [];
  }

  export function clearNotification(transferId: string) {
    notifications = notifications.filter(n => n.transferId !== transferId);
  }
</script>

<div class={containerClass} data-testid="notification-container">
  {#each visibleNotifications as notification (notification.id)}
    <TransferNotification
      transferId={notification.transferId}
      status={notification.status}
      filename={notification.filename}
      error={notification.error || ''}
      duration={notification.duration || 0}
      on:close={handleNotificationClose}
      on:click={handleNotificationClick}
    />
  {/each}
</div>

<style>
  .notification-container {
    position: fixed;
    z-index: 1000;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 400px;
    padding: 1rem;
  }

  .notification-container > :global(*) {
    pointer-events: auto;
  }

  .top-right {
    top: 0;
    right: 0;
  }

  .top-left {
    top: 0;
    left: 0;
  }

  .bottom-right {
    bottom: 0;
    right: 0;
    flex-direction: column-reverse;
  }

  .bottom-left {
    bottom: 0;
    left: 0;
    flex-direction: column-reverse;
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .notification-container {
      left: 0.5rem;
      right: 0.5rem;
      max-width: none;
      padding: 0.5rem;
    }

    .top-left,
    .top-right {
      top: 0;
    }

    .bottom-left,
    .bottom-right {
      bottom: 0;
    }
  }
</style>