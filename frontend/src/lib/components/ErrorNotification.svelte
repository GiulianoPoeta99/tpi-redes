<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { ErrorNotification, ErrorAction } from '../error-handling';
  
  export let notification: ErrorNotification;
  
  const dispatch = createEventDispatcher<{
    dismiss: string;
    action: { id: string; action: ErrorAction };
  }>();
  
  let visible = false;
  let element: HTMLDivElement;
  
  onMount(() => {
    // Animate in
    setTimeout(() => {
      visible = true;
    }, 10);
  });
  
  function handleDismiss() {
    visible = false;
    setTimeout(() => {
      dispatch('dismiss', notification.id);
    }, 300);
  }
  
  function handleAction(action: ErrorAction) {
    dispatch('action', { id: notification.id, action });
    if (!action.primary) {
      handleDismiss();
    }
  }
  
  function getErrorIcon(errorCode: string): string {
    switch (errorCode) {
      case 'NETWORK_ERROR':
      case 'CONNECTION_REFUSED':
        return '🌐';
      case 'FILE_ERROR':
      case 'FILE_NOT_FOUND':
        return '📁';
      case 'PERMISSION_DENIED':
        return '🔒';
      case 'CHECKSUM_MISMATCH':
      case 'CORRUPTED_DATA':
        return '⚠️';
      case 'TIMEOUT':
        return '⏱️';
      case 'INSUFFICIENT_SPACE':
        return '💾';
      case 'CANCELLED':
        return '⏹️';
      default:
        return '❌';
    }
  }
  
  function getErrorSeverity(error: any): 'error' | 'warning' | 'info' {
    if (error.recoverable) {
      return 'warning';
    }
    
    if (['CANCELLED', 'TIMEOUT'].includes(error.code)) {
      return 'info';
    }
    
    return 'error';
  }
</script>

<div
  bind:this={element}
  class="error-notification"
  class:visible
  class:error={getErrorSeverity(notification.error) === 'error'}
  class:warning={getErrorSeverity(notification.error) === 'warning'}
  class:info={getErrorSeverity(notification.error) === 'info'}
  role="alert"
  aria-live="polite"
>
  <div class="error-content">
    <div class="error-icon">
      {getErrorIcon(notification.error.code)}
    </div>
    
    <div class="error-details">
      <div class="error-message">
        {notification.error.message}
      </div>
      
      {#if notification.error.recoverySuggestion}
        <div class="error-suggestion">
          💡 {notification.error.recoverySuggestion}
        </div>
      {/if}
      
      {#if notification.error.context}
        <div class="error-context">
          Context: {notification.error.context}
        </div>
      {/if}
    </div>
    
    <div class="error-actions">
      {#if notification.actions && notification.actions.length > 0}
        {#each notification.actions as action}
          <button
            class="action-button"
            class:primary={action.primary}
            on:click={() => handleAction(action)}
          >
            {action.label}
          </button>
        {/each}
      {/if}
      
      <button
        class="dismiss-button"
        on:click={handleDismiss}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  </div>
  
  {#if notification.error.recoverable}
    <div class="error-footer">
      <small>This error can be retried</small>
    </div>
  {/if}
</div>

<style>
  .error-notification {
    position: relative;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    margin-bottom: 12px;
    overflow: hidden;
    transform: translateX(100%);
    transition: all 0.3s ease-out;
    max-width: 500px;
    border-left: 4px solid;
  }
  
  .error-notification.visible {
    transform: translateX(0);
  }
  
  .error-notification.error {
    border-left-color: #ef4444;
    background: #fef2f2;
  }
  
  .error-notification.warning {
    border-left-color: #f59e0b;
    background: #fffbeb;
  }
  
  .error-notification.info {
    border-left-color: #3b82f6;
    background: #eff6ff;
  }
  
  .error-content {
    display: flex;
    align-items: flex-start;
    padding: 16px;
    gap: 12px;
  }
  
  .error-icon {
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  .error-details {
    flex: 1;
    min-width: 0;
  }
  
  .error-message {
    font-weight: 500;
    color: #374151;
    margin-bottom: 4px;
    word-wrap: break-word;
  }
  
  .error-suggestion {
    font-size: 14px;
    color: #6b7280;
    margin-bottom: 4px;
    line-height: 1.4;
  }
  
  .error-context {
    font-size: 12px;
    color: #9ca3af;
    font-family: monospace;
    background: rgba(0, 0, 0, 0.05);
    padding: 4px 8px;
    border-radius: 4px;
    margin-top: 8px;
  }
  
  .error-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
  }
  
  .action-button {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  
  .action-button:hover {
    background: #e5e7eb;
  }
  
  .action-button.primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
  
  .action-button.primary:hover {
    background: #2563eb;
  }
  
  .dismiss-button {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #9ca3af;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
  }
  
  .dismiss-button:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #6b7280;
  }
  
  .error-footer {
    background: rgba(0, 0, 0, 0.05);
    padding: 8px 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  .error-footer small {
    color: #6b7280;
    font-size: 12px;
  }
  
  /* Responsive design */
  @media (max-width: 640px) {
    .error-notification {
      max-width: none;
      margin: 0 16px 12px 16px;
    }
    
    .error-content {
      padding: 12px;
    }
    
    .error-actions {
      flex-direction: row;
      flex-wrap: wrap;
    }
    
    .action-button {
      font-size: 12px;
      padding: 4px 8px;
    }
  }
</style>