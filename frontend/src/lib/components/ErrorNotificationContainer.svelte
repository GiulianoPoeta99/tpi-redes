<script lang="ts">
  import { onMount } from 'svelte';
  import ErrorNotification from './ErrorNotification.svelte';
  import { errorNotifications, type ErrorAction } from '../error-handling';
  import type { ErrorNotification as ErrorNotificationType } from '../error-handling';
  
  let notifications: ErrorNotificationType[] = [];
  
  onMount(() => {
    const unsubscribe = errorNotifications.subscribe((notifs) => {
      notifications = notifs;
    });
    
    return unsubscribe;
  });
  
  function handleDismiss(event: CustomEvent<string>) {
    errorNotifications.dismissError(event.detail);
  }
  
  async function handleAction(event: CustomEvent<{ id: string; action: ErrorAction }>) {
    const { id, action } = event.detail;
    
    try {
      await action.action();
      
      // If the action was successful and it was a primary action (like retry),
      // dismiss the notification
      if (action.primary) {
        errorNotifications.dismissError(id);
      }
    } catch (error) {
      console.error('Error action failed:', error);
      // The error will be handled by the global error handler
    }
  }
</script>

<div class="error-notification-container" role="region" aria-label="Error notifications">
  {#each notifications as notification (notification.id)}
    <ErrorNotification
      {notification}
      on:dismiss={handleDismiss}
      on:action={handleAction}
    />
  {/each}
</div>

<style>
  .error-notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    pointer-events: none;
  }
  
  .error-notification-container :global(.error-notification) {
    pointer-events: auto;
  }
  
  /* Ensure notifications stack properly */
  .error-notification-container :global(.error-notification:not(:last-child)) {
    margin-bottom: 12px;
  }
  
  /* Mobile responsive */
  @media (max-width: 640px) {
    .error-notification-container {
      top: 10px;
      right: 10px;
      left: 10px;
    }
  }
</style>