<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { TransferStatus } from '../types';

  // Props
  export let transferId: string;
  export let status: TransferStatus;
  export let filename: string = '';
  export let error: string = '';
  export let duration: number = 0;
  export let autoHide: boolean = true;
  export let hideDelay: number = 5000; // 5 seconds

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    close: { transferId: string };
    click: { transferId: string };
  }>();

  // Local state
  let visible = true;
  let timeoutId: number | null = null;

  // Reactive statements
  $: notificationClass = getNotificationClass(status);
  $: notificationIcon = getNotificationIcon(status);
  $: notificationTitle = getNotificationTitle(status);
  $: notificationMessage = getNotificationMessage(status, filename, error, duration);

  function getNotificationClass(status: TransferStatus): string {
    switch (status) {
      case 'Completed': return 'notification-success';
      case 'Error': return 'notification-error';
      case 'Cancelled': return 'notification-warning';
      default: return 'notification-info';
    }
  }

  function getNotificationIcon(status: TransferStatus): string {
    switch (status) {
      case 'Completed': return '✅';
      case 'Error': return '❌';
      case 'Cancelled': return '🚫';
      case 'Connecting': return '🔄';
      case 'Transferring': return '📤';
      default: return 'ℹ️';
    }
  }

  function getNotificationTitle(status: TransferStatus): string {
    switch (status) {
      case 'Completed': return 'Transfer Completed';
      case 'Error': return 'Transfer Failed';
      case 'Cancelled': return 'Transfer Cancelled';
      case 'Connecting': return 'Connecting';
      case 'Transferring': return 'Transfer in Progress';
      default: return 'Transfer Update';
    }
  }

  function getNotificationMessage(
    status: TransferStatus, 
    filename: string, 
    error: string, 
    duration: number
  ): string {
    const fileText = filename ? `"${filename}"` : 'File';
    
    switch (status) {
      case 'Completed':
        const durationText = duration > 0 ? ` in ${formatDuration(duration)}` : '';
        return `${fileText} transferred successfully${durationText}`;
      case 'Error':
        return `${fileText} transfer failed${error ? `: ${error}` : ''}`;
      case 'Cancelled':
        return `${fileText} transfer was cancelled`;
      case 'Connecting':
        return `Connecting to transfer ${fileText}`;
      case 'Transferring':
        return `Transferring ${fileText}`;
      default:
        return `${fileText} transfer status updated`;
    }
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  function handleClose() {
    visible = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    dispatch('close', { transferId });
  }

  function handleClick() {
    dispatch('click', { transferId });
  }

  onMount(() => {
    if (autoHide && (status === 'Completed' || status === 'Error' || status === 'Cancelled')) {
      timeoutId = window.setTimeout(() => {
        handleClose();
      }, hideDelay);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  });
</script>

{#if visible}
  <div 
    class="transfer-notification {notificationClass}"
    class:visible
    on:click={handleClick}
    on:keydown={(e) => e.key === 'Enter' && handleClick()}
    role="button"
    tabindex="0"
    data-testid="transfer-notification"
  >
    <div class="notification-content">
      <div class="notification-header">
        <span class="notification-icon" data-testid="notification-icon">
          {notificationIcon}
        </span>
        <span class="notification-title" data-testid="notification-title">
          {notificationTitle}
        </span>
        <button 
          class="close-button"
          on:click|stopPropagation={handleClose}
          data-testid="close-button"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
      
      <div class="notification-message" data-testid="notification-message">
        {notificationMessage}
      </div>
    </div>

    {#if autoHide && (status === 'Completed' || status === 'Error' || status === 'Cancelled')}
      <div class="progress-indicator">
        <div class="progress-bar" style="animation-duration: {hideDelay}ms"></div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .transfer-notification {
    position: relative;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    margin-bottom: 0.5rem;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease-in-out;
    transform: translateX(100%);
    opacity: 0;
    max-width: 400px;
    min-width: 300px;
  }

  .transfer-notification.visible {
    transform: translateX(0);
    opacity: 1;
  }

  .transfer-notification:hover {
    transform: translateX(-4px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .notification-success {
    border-left: 4px solid #10b981;
  }

  .notification-error {
    border-left: 4px solid #ef4444;
  }

  .notification-warning {
    border-left: 4px solid #f59e0b;
  }

  .notification-info {
    border-left: 4px solid #3b82f6;
  }

  .notification-content {
    padding: 1rem;
  }

  .notification-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .notification-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .notification-title {
    font-weight: 600;
    color: #1f2937;
    flex-grow: 1;
  }

  .close-button {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    font-size: 0.875rem;
    line-height: 1;
    transition: all 0.2s ease-in-out;
    flex-shrink: 0;
  }

  .close-button:hover {
    background-color: #f3f4f6;
    color: #374151;
  }

  .notification-message {
    color: #6b7280;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .progress-indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background-color: rgba(0, 0, 0, 0.1);
  }

  .progress-bar {
    height: 100%;
    background-color: currentColor;
    width: 100%;
    transform-origin: left;
    animation: shrink linear forwards;
  }

  .notification-success .progress-bar {
    background-color: #10b981;
  }

  .notification-error .progress-bar {
    background-color: #ef4444;
  }

  .notification-warning .progress-bar {
    background-color: #f59e0b;
  }

  .notification-info .progress-bar {
    background-color: #3b82f6;
  }

  @keyframes shrink {
    from {
      transform: scaleX(1);
    }
    to {
      transform: scaleX(0);
    }
  }

  /* Focus styles for accessibility */
  .transfer-notification:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .close-button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 1px;
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .transfer-notification {
      max-width: 100%;
      min-width: 280px;
    }

    .notification-content {
      padding: 0.75rem;
    }

    .notification-title {
      font-size: 0.875rem;
    }

    .notification-message {
      font-size: 0.8125rem;
    }
  }
</style>