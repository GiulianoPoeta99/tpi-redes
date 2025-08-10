<script lang="ts">
  import { notifications, notificationStore } from '../stores/notifications';
  import type { Notification } from '../stores/notifications';
  import { slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  // Reactive subscription to notifications
  $: notificationList = $notifications;

  function handleDismiss(id: string) {
    notificationStore.remove(id);
  }

  function handleAction(notification: Notification, actionIndex: number) {
    const action = notification.actions?.[actionIndex];
    if (action) {
      action.action();
      // Remove notification after action unless it's persistent
      if (!notification.persistent) {
        handleDismiss(notification.id);
      }
    }
  }

  function getNotificationIcon(type: Notification['type']): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  }

  function getNotificationClass(type: Notification['type']): string {
    const baseClass = 'notification';
    switch (type) {
      case 'success': return `${baseClass} notification-success`;
      case 'error': return `${baseClass} notification-error`;
      case 'warning': return `${baseClass} notification-warning`;
      default: return `${baseClass} notification-info`;
    }
  }

  function formatTime(timestamp: Date): string {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
</script>

<div class="notification-container" data-testid="notification-container">
  {#each notificationList as notification (notification.id)}
    <div
      class={getNotificationClass(notification.type)}
      data-testid="notification"
      data-type={notification.type}
      transition:slide={{ duration: 300, easing: quintOut }}
    >
      <div class="notification-content">
        <div class="notification-header">
          <span class="notification-icon" aria-label={notification.type}>
            {getNotificationIcon(notification.type)}
          </span>
          <h4 class="notification-title">{notification.title}</h4>
          <span class="notification-time">{formatTime(notification.timestamp)}</span>
          <button
            class="notification-close"
            on:click={() => handleDismiss(notification.id)}
            aria-label="Dismiss notification"
            data-testid="dismiss-button"
          >
            ✕
          </button>
        </div>
        
        <p class="notification-message">{notification.message}</p>
        
        {#if notification.actions && notification.actions.length > 0}
          <div class="notification-actions">
            {#each notification.actions as action, index}
              <button
                class="notification-action notification-action-{action.style || 'secondary'}"
                on:click={() => handleAction(notification, index)}
                data-testid="notification-action"
              >
                {action.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .notification-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 400px;
    pointer-events: none;
  }

  .notification {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-left: 4px solid;
    pointer-events: auto;
    overflow: hidden;
  }

  .notification-info {
    border-left-color: #3b82f6;
  }

  .notification-success {
    border-left-color: #10b981;
  }

  .notification-warning {
    border-left-color: #f59e0b;
  }

  .notification-error {
    border-left-color: #ef4444;
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
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .notification-title {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0;
    flex-grow: 1;
    color: #1f2937;
  }

  .notification-time {
    font-size: 0.75rem;
    color: #6b7280;
    flex-shrink: 0;
  }

  .notification-close {
    background: none;
    border: none;
    font-size: 1rem;
    color: #6b7280;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .notification-close:hover {
    background-color: #f3f4f6;
    color: #374151;
  }

  .notification-message {
    font-size: 0.85rem;
    color: #4b5563;
    margin: 0;
    line-height: 1.4;
  }

  .notification-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    flex-wrap: wrap;
  }

  .notification-action {
    padding: 0.375rem 0.75rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid;
    transition: all 0.2s;
  }

  .notification-action-primary {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .notification-action-primary:hover {
    background-color: #2563eb;
    border-color: #2563eb;
  }

  .notification-action-secondary {
    background-color: white;
    color: #6b7280;
    border-color: #d1d5db;
  }

  .notification-action-secondary:hover {
    background-color: #f9fafb;
    color: #374151;
    border-color: #9ca3af;
  }

  .notification-action-danger {
    background-color: #ef4444;
    color: white;
    border-color: #ef4444;
  }

  .notification-action-danger:hover {
    background-color: #dc2626;
    border-color: #dc2626;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .notification {
      background: #1f2937;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .notification-title {
      color: #f9fafb;
    }

    .notification-message {
      color: #d1d5db;
    }

    .notification-time {
      color: #9ca3af;
    }

    .notification-close {
      color: #9ca3af;
    }

    .notification-close:hover {
      background-color: #374151;
      color: #d1d5db;
    }

    .notification-action-secondary {
      background-color: #374151;
      color: #d1d5db;
      border-color: #4b5563;
    }

    .notification-action-secondary:hover {
      background-color: #4b5563;
      color: #f9fafb;
      border-color: #6b7280;
    }
  }

  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .notification-container {
      left: 1rem;
      right: 1rem;
      max-width: none;
    }

    .notification-content {
      padding: 0.75rem;
    }

    .notification-title {
      font-size: 0.85rem;
    }

    .notification-message {
      font-size: 0.8rem;
    }

    .notification-actions {
      margin-top: 0.5rem;
    }

    .notification-action {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
  }
</style>