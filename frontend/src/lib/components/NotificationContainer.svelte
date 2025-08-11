<script lang="ts">
  import { onMount } from 'svelte';
  import { systemNotifications, notificationSettings } from '../services/system-notifications';
  import { notificationStore } from '../stores/notifications';
  import NotificationDisplay from './NotificationDisplay.svelte';
  import TransferNotification from './TransferNotification.svelte';
  import type { SystemNotificationOptions } from '../services/system-notifications';
  import type { TransferStatus } from '../types';

  // Component props
  export let showSystemNotifications = true;
  export let showInAppNotifications = true;

  // Local state for transfer notifications
  let transferNotifications: Array<{
    id: string;
    transferId: string;
    status: TransferStatus;
    filename: string;
    error?: string;
    duration?: number;
  }> = [];

  onMount(() => {
    // Set up fallback handler for system notifications
    const unsubscribeFallback = systemNotifications.onFallback((options: SystemNotificationOptions) => {
      // Convert system notification to in-app notification
      const type = getNotificationTypeFromIcon(options.icon);
      notificationStore.add({
        title: options.title,
        message: options.body,
        type
      });
    });

    // Listen for system notification events
    const handleSystemNotificationClicked = (event: CustomEvent) => {
      console.log('System notification clicked:', event.detail);
      // Handle notification click - could navigate to specific view
    };

    const handleSystemNotificationAction = (event: CustomEvent) => {
      console.log('System notification action:', event.detail);
    };

    // Listen for transfer events to show notifications
    const handleTransferStarted = (event: CustomEvent) => {
      const { transfer_id, filename } = event.detail;
      
      if (showSystemNotifications) {
        systemNotifications.show({
          title: 'Transfer Started',
          body: `Starting transfer of ${filename}`,
          icon: 'info'
        });
      }
    };

    const handleTransferProgress = (event: CustomEvent) => {
      // Don't show notifications for progress updates to avoid spam
      // Progress is handled by the progress component
    };

    const handleTransferCompleted = (event: CustomEvent) => {
      const { transfer_id, filename, bytes_transferred, duration, checksum } = event.detail;
      
      if (showSystemNotifications) {
        systemNotifications.showTransferComplete(filename, bytes_transferred, duration);
      }

      // Add to transfer notifications for in-app display
      addTransferNotification({
        id: `completed-${transfer_id}`,
        transferId: transfer_id,
        status: 'Completed',
        filename,
        duration
      });
    };

    const handleTransferError = (event: CustomEvent) => {
      const { transfer_id, filename, error } = event.detail;
      
      if (showSystemNotifications) {
        systemNotifications.showTransferError(filename, error);
      }

      // Add to transfer notifications for in-app display
      addTransferNotification({
        id: `error-${transfer_id}`,
        transferId: transfer_id,
        status: 'Error',
        filename,
        error
      });
    };

    const handleTransferCancelled = (event: CustomEvent) => {
      const { transfer_id, filename } = event.detail;
      
      if (showSystemNotifications) {
        systemNotifications.show({
          title: 'Transfer Cancelled',
          body: `Transfer of ${filename} was cancelled`,
          icon: 'warning'
        });
      }

      // Add to transfer notifications for in-app display
      addTransferNotification({
        id: `cancelled-${transfer_id}`,
        transferId: transfer_id,
        status: 'Cancelled',
        filename
      });
    };

    const handleConnectionEvent = (event: CustomEvent) => {
      const { status, address, protocol } = event.detail;
      
      if (showSystemNotifications) {
        systemNotifications.showConnectionStatus(status, address, protocol);
      }
    };

    // Add event listeners
    window.addEventListener('system-notification-clicked', handleSystemNotificationClicked);
    window.addEventListener('system-notification-action', handleSystemNotificationAction);
    window.addEventListener('transfer-started', handleTransferStarted);
    window.addEventListener('transfer-progress', handleTransferProgress);
    window.addEventListener('transfer-completed', handleTransferCompleted);
    window.addEventListener('transfer-error', handleTransferError);
    window.addEventListener('transfer-cancelled', handleTransferCancelled);
    window.addEventListener('transfer-connection', handleConnectionEvent);

    // Cleanup
    return () => {
      unsubscribeFallback();
      window.removeEventListener('system-notification-clicked', handleSystemNotificationClicked);
      window.removeEventListener('system-notification-action', handleSystemNotificationAction);
      window.removeEventListener('transfer-started', handleTransferStarted);
      window.removeEventListener('transfer-progress', handleTransferProgress);
      window.removeEventListener('transfer-completed', handleTransferCompleted);
      window.removeEventListener('transfer-error', handleTransferError);
      window.removeEventListener('transfer-cancelled', handleTransferCancelled);
      window.removeEventListener('transfer-connection', handleConnectionEvent);
    };
  });

  function addTransferNotification(notification: typeof transferNotifications[0]) {
    transferNotifications = [notification, ...transferNotifications.slice(0, 4)]; // Keep max 5
    
    // Auto-remove after delay
    setTimeout(() => {
      removeTransferNotification(notification.id);
    }, 8000);
  }

  function removeTransferNotification(id: string) {
    transferNotifications = transferNotifications.filter(n => n.id !== id);
  }

  function handleTransferNotificationClose(event: CustomEvent) {
    const { transferId } = event.detail;
    transferNotifications = transferNotifications.filter(n => n.transferId !== transferId);
  }

  function handleTransferNotificationClick(event: CustomEvent) {
    const { transferId } = event.detail;
    // Could navigate to transfer details or history
    console.log('Transfer notification clicked:', transferId);
  }

  function getNotificationTypeFromIcon(icon?: string): 'info' | 'success' | 'warning' | 'error' {
    switch (icon) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }


</script>

<div class="notification-container" data-testid="notification-container">
  <!-- In-app notifications -->
  {#if showInAppNotifications}
    <NotificationDisplay />
  {/if}

  <!-- Transfer-specific notifications -->
  <div class="transfer-notifications" data-testid="transfer-notifications">
    {#each transferNotifications as notification (notification.id)}
      <TransferNotification
        transferId={notification.transferId}
        status={notification.status}
        filename={notification.filename}
        error={notification.error || ''}
        duration={notification.duration || 0}
        autoHide={true}
        hideDelay={8000}
        on:close={handleTransferNotificationClose}
        on:click={handleTransferNotificationClick}
      />
    {/each}
  </div>
</div>

<style>
  .notification-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    pointer-events: none;
    max-width: 400px;
  }

  .transfer-notifications {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .notification-container {
      left: 1rem;
      right: 1rem;
      max-width: none;
    }
  }
</style>