<script lang="ts">
  import { onMount } from 'svelte';
  import { notificationSettings, systemNotifications, type NotificationPermission } from '../services/system-notifications';
  import type { NotificationSettings } from '../services/system-notifications';

  // Component props
  export let showAdvanced = false;

  // Local state
  let settings: NotificationSettings;
  let permission: NotificationPermission = 'unknown';
  let isSupported = false;
  let isRequestingPermission = false;
  let testNotificationSent = false;

  // Subscribe to settings store
  const unsubscribe = notificationSettings.subscribe(value => {
    settings = value;
  });

  onMount(async () => {
    // Check system notification support and permission
    isSupported = systemNotifications.supported;
    permission = systemNotifications.permission;

    // Set up fallback handler for in-app notifications
    const unsubscribeFallback = systemNotifications.onFallback((options) => {
      // Show in-app notification as fallback
      window.dispatchEvent(new CustomEvent('fallback-notification', {
        detail: options
      }));
    });

    return () => {
      unsubscribe();
      unsubscribeFallback();
    };
  });

  async function requestPermission() {
    if (isRequestingPermission) return;
    
    isRequestingPermission = true;
    try {
      permission = await systemNotifications.requestPermission();
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      isRequestingPermission = false;
    }
  }

  async function sendTestNotification() {
    if (testNotificationSent) return;
    
    testNotificationSent = true;
    try {
      await systemNotifications.show({
        title: 'Test Notification',
        body: 'This is a test notification from File Transfer App',
        icon: 'info',
        sound: settings.soundEnabled ? 'default' : undefined
      });
      
      // Reset after 3 seconds
      setTimeout(() => {
        testNotificationSent = false;
      }, 3000);
    } catch (error) {
      console.error('Failed to send test notification:', error);
      testNotificationSent = false;
    }
  }

  function updateSetting<K extends keyof NotificationSettings>(
    key: K, 
    value: NotificationSettings[K]
  ) {
    notificationSettings.updateSetting(key, value);
  }

  function resetSettings() {
    if (confirm('Reset all notification settings to defaults?')) {
      notificationSettings.reset();
    }
  }

  function exportSettings() {
    const settingsData = notificationSettings.export();
    const blob = new Blob([JSON.stringify(settingsData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notification-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const importedSettings = JSON.parse(text);
        notificationSettings.import(importedSettings);
      } catch (error) {
        alert('Failed to import settings: Invalid file format');
        console.error('Import error:', error);
      }
    };
    
    input.click();
  }

  // Reactive statements
  $: canShowSystemNotifications = isSupported && permission === 'granted';
  $: needsPermission = isSupported && permission !== 'granted';
  $: permissionStatusText = getPermissionStatusText(permission, isSupported);

  function getPermissionStatusText(permission: NotificationPermission, supported: boolean): string {
    if (!supported) return 'System notifications not supported';
    
    switch (permission) {
      case 'granted': return 'System notifications enabled';
      case 'denied': return 'System notifications blocked';
      case 'default': return 'Permission not requested';
      default: return 'Permission status unknown';
    }
  }
</script>

<div class="notification-settings" data-testid="notification-settings">
  <div class="settings-header">
    <h3>Notification Settings</h3>
    <p class="settings-description">
      Configure how and when you receive notifications about file transfers.
    </p>
  </div>

  <!-- System notification status -->
  <div class="setting-group">
    <div class="setting-item">
      <div class="setting-info">
        <label class="setting-label">System Notifications</label>
        <p class="setting-description">{permissionStatusText}</p>
      </div>
      
      <div class="setting-controls">
        {#if needsPermission}
          <button 
            class="btn btn-primary"
            on:click={requestPermission}
            disabled={isRequestingPermission}
            data-testid="request-permission-btn"
          >
            {isRequestingPermission ? 'Requesting...' : 'Enable'}
          </button>
        {:else if canShowSystemNotifications}
          <button 
            class="btn btn-secondary"
            on:click={sendTestNotification}
            disabled={testNotificationSent}
            data-testid="test-notification-btn"
          >
            {testNotificationSent ? 'Sent!' : 'Test'}
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Basic notification settings -->
  <div class="setting-group">
    <div class="setting-item">
      <div class="setting-info">
        <label class="setting-label" for="notifications-enabled">
          Enable Notifications
        </label>
        <p class="setting-description">
          Show notifications for transfer events
        </p>
      </div>
      
      <div class="setting-controls">
        <label class="toggle">
          <input
            id="notifications-enabled"
            type="checkbox"
            bind:checked={settings.enabled}
            on:change={() => updateSetting('enabled', settings.enabled)}
            data-testid="notifications-enabled"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="setting-item" class:disabled={!settings.enabled}>
      <div class="setting-info">
        <label class="setting-label" for="sound-enabled">
          Notification Sounds
        </label>
        <p class="setting-description">
          Play sound with notifications
        </p>
      </div>
      
      <div class="setting-controls">
        <label class="toggle">
          <input
            id="sound-enabled"
            type="checkbox"
            bind:checked={settings.soundEnabled}
            on:change={() => updateSetting('soundEnabled', settings.soundEnabled)}
            disabled={!settings.enabled}
            data-testid="sound-enabled"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>

  <!-- Notification types -->
  <div class="setting-group">
    <h4 class="group-title">Notification Types</h4>
    
    <div class="setting-item" class:disabled={!settings.enabled}>
      <div class="setting-info">
        <label class="setting-label" for="transfer-complete">
          Transfer Complete
        </label>
        <p class="setting-description">
          Notify when file transfers complete successfully
        </p>
      </div>
      
      <div class="setting-controls">
        <label class="toggle">
          <input
            id="transfer-complete"
            type="checkbox"
            bind:checked={settings.showOnTransferComplete}
            on:change={() => updateSetting('showOnTransferComplete', settings.showOnTransferComplete)}
            disabled={!settings.enabled}
            data-testid="transfer-complete"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="setting-item" class:disabled={!settings.enabled}>
      <div class="setting-info">
        <label class="setting-label" for="transfer-error">
          Transfer Errors
        </label>
        <p class="setting-description">
          Notify when file transfers fail
        </p>
      </div>
      
      <div class="setting-controls">
        <label class="toggle">
          <input
            id="transfer-error"
            type="checkbox"
            bind:checked={settings.showOnTransferError}
            on:change={() => updateSetting('showOnTransferError', settings.showOnTransferError)}
            disabled={!settings.enabled}
            data-testid="transfer-error"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="setting-item" class:disabled={!settings.enabled}>
      <div class="setting-info">
        <label class="setting-label" for="connection-status">
          Connection Status
        </label>
        <p class="setting-description">
          Notify about connection events
        </p>
      </div>
      
      <div class="setting-controls">
        <label class="toggle">
          <input
            id="connection-status"
            type="checkbox"
            bind:checked={settings.showOnConnectionStatus}
            on:change={() => updateSetting('showOnConnectionStatus', settings.showOnConnectionStatus)}
            disabled={!settings.enabled}
            data-testid="connection-status"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>

  <!-- Advanced settings -->
  {#if showAdvanced}
    <div class="setting-group">
      <h4 class="group-title">Advanced Settings</h4>
      
      <div class="setting-item" class:disabled={!settings.enabled}>
        <div class="setting-info">
          <label class="setting-label" for="fallback-in-app">
            Fallback to In-App Notifications
          </label>
          <p class="setting-description">
            Show in-app notifications when system notifications fail
          </p>
        </div>
        
        <div class="setting-controls">
          <label class="toggle">
            <input
              id="fallback-in-app"
              type="checkbox"
              bind:checked={settings.fallbackToInApp}
              on:change={() => updateSetting('fallbackToInApp', settings.fallbackToInApp)}
              disabled={!settings.enabled}
              data-testid="fallback-in-app"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="setting-item" class:disabled={!settings.enabled}>
        <div class="setting-info">
          <label class="setting-label" for="auto-focus">
            Auto-Focus on Click
          </label>
          <p class="setting-description">
            Bring app to foreground when notification is clicked
          </p>
        </div>
        
        <div class="setting-controls">
          <label class="toggle">
            <input
              id="auto-focus"
              type="checkbox"
              bind:checked={settings.autoFocusOnClick}
              on:change={() => updateSetting('autoFocusOnClick', settings.autoFocusOnClick)}
              disabled={!settings.enabled}
              data-testid="auto-focus"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  {/if}

  <!-- Settings management -->
  <div class="setting-group">
    <div class="settings-actions">
      <button 
        class="btn btn-secondary"
        on:click={() => showAdvanced = !showAdvanced}
        data-testid="toggle-advanced"
      >
        {showAdvanced ? 'Hide' : 'Show'} Advanced
      </button>
      
      <button 
        class="btn btn-secondary"
        on:click={exportSettings}
        data-testid="export-settings"
      >
        Export Settings
      </button>
      
      <button 
        class="btn btn-secondary"
        on:click={importSettings}
        data-testid="import-settings"
      >
        Import Settings
      </button>
      
      <button 
        class="btn btn-danger"
        on:click={resetSettings}
        data-testid="reset-settings"
      >
        Reset to Defaults
      </button>
    </div>
  </div>
</div>

<style>
  .notification-settings {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  .settings-header {
    margin-bottom: 2rem;
  }

  .settings-header h3 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .settings-description {
    margin: 0;
    color: #6b7280;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .setting-group {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .group-title {
    margin: 0 0 1rem 0;
    color: #374151;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .setting-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .setting-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .setting-item.disabled {
    opacity: 0.5;
  }

  .setting-info {
    flex: 1;
  }

  .setting-label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.25rem;
    cursor: pointer;
  }

  .setting-item.disabled .setting-label {
    cursor: not-allowed;
  }

  .setting-description {
    margin: 0;
    font-size: 0.85rem;
    color: #6b7280;
    line-height: 1.4;
  }

  .setting-controls {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Toggle switch styles */
  .toggle {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    cursor: pointer;
  }

  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #cbd5e1;
    transition: 0.3s;
    border-radius: 24px;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .toggle input:checked + .toggle-slider {
    background-color: #3b82f6;
  }

  .toggle input:checked + .toggle-slider:before {
    transform: translateX(20px);
  }

  .toggle input:disabled + .toggle-slider {
    cursor: not-allowed;
    opacity: 0.5;
  }

  /* Button styles */
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .btn-primary {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #2563eb;
    border-color: #2563eb;
  }

  .btn-secondary {
    background-color: white;
    color: #6b7280;
    border-color: #d1d5db;
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: #f9fafb;
    color: #374151;
    border-color: #9ca3af;
  }

  .btn-danger {
    background-color: #ef4444;
    color: white;
    border-color: #ef4444;
  }

  .btn-danger:hover:not(:disabled) {
    background-color: #dc2626;
    border-color: #dc2626;
  }

  .settings-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .settings-header h3 {
      color: #f9fafb;
    }

    .settings-description,
    .setting-description {
      color: #9ca3af;
    }

    .setting-group {
      background: #374151;
      border-color: #4b5563;
    }

    .group-title {
      color: #d1d5db;
    }

    .setting-item {
      border-bottom-color: #4b5563;
    }

    .setting-label {
      color: #d1d5db;
    }

    .toggle-slider {
      background-color: #4b5563;
    }

    .btn-secondary {
      background-color: #374151;
      color: #d1d5db;
      border-color: #4b5563;
    }

    .btn-secondary:hover:not(:disabled) {
      background-color: #4b5563;
      color: #f9fafb;
      border-color: #6b7280;
    }
  }

  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .notification-settings {
      padding: 1rem;
    }

    .setting-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .setting-controls {
      align-self: flex-end;
    }

    .settings-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>