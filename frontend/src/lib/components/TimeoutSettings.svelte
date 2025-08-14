<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let connectionTimeout: number = 10;
  export let readTimeout: number = 30;
  export let writeTimeout: number = 30;
  export let retryAttempts: number = 3;
  export let retryDelay: number = 1;
  export let autoRetryEnabled: boolean = true;
  
  const dispatch = createEventDispatcher<{
    save: {
      connectionTimeout: number;
      readTimeout: number;
      writeTimeout: number;
      retryAttempts: number;
      retryDelay: number;
      autoRetryEnabled: boolean;
    };
    reset: void;
    cancel: void;
  }>();
  
  let localConnectionTimeout = connectionTimeout;
  let localReadTimeout = readTimeout;
  let localWriteTimeout = writeTimeout;
  let localRetryAttempts = retryAttempts;
  let localRetryDelay = retryDelay;
  let localAutoRetryEnabled = autoRetryEnabled;
  
  $: hasChanges = 
    localConnectionTimeout !== connectionTimeout ||
    localReadTimeout !== readTimeout ||
    localWriteTimeout !== writeTimeout ||
    localRetryAttempts !== retryAttempts ||
    localRetryDelay !== retryDelay ||
    localAutoRetryEnabled !== autoRetryEnabled;
  
  function handleSave() {
    dispatch('save', {
      connectionTimeout: localConnectionTimeout,
      readTimeout: localReadTimeout,
      writeTimeout: localWriteTimeout,
      retryAttempts: localRetryAttempts,
      retryDelay: localRetryDelay,
      autoRetryEnabled: localAutoRetryEnabled,
    });
  }
  
  function handleReset() {
    localConnectionTimeout = 10;
    localReadTimeout = 30;
    localWriteTimeout = 30;
    localRetryAttempts = 3;
    localRetryDelay = 1;
    localAutoRetryEnabled = true;
    dispatch('reset');
  }
  
  function handleCancel() {
    localConnectionTimeout = connectionTimeout;
    localReadTimeout = readTimeout;
    localWriteTimeout = writeTimeout;
    localRetryAttempts = retryAttempts;
    localRetryDelay = retryDelay;
    localAutoRetryEnabled = autoRetryEnabled;
    dispatch('cancel');
  }
  
  function getRecommendation(type: string): string {
    switch (type) {
      case 'connection':
        return 'Time to wait for initial connection. Lower for local networks, higher for internet.';
      case 'read':
        return 'Time to wait for data reception. Increase for slow or unstable networks.';
      case 'write':
        return 'Time to wait for data transmission. Increase for slow upload speeds.';
      case 'retry':
        return 'Number of automatic retry attempts for recoverable errors.';
      case 'delay':
        return 'Initial delay between retry attempts. Actual delay increases exponentially.';
      default:
        return '';
    }
  }
</script>

<div class="timeout-settings">
  <div class="settings-header">
    <h3>Timeout & Retry Settings</h3>
    <p>Configure timeout values and retry behavior for better error handling</p>
  </div>
  
  <div class="settings-content">
    <div class="setting-group">
      <h4>Timeout Configuration</h4>
      
      <div class="setting-item">
        <label for="connection-timeout">
          <span class="setting-label">Connection Timeout</span>
          <span class="setting-value">{localConnectionTimeout}s</span>
        </label>
        <input
          id="connection-timeout"
          type="range"
          min="5"
          max="60"
          step="1"
          bind:value={localConnectionTimeout}
        />
        <div class="setting-description">
          {getRecommendation('connection')}
        </div>
      </div>
      
      <div class="setting-item">
        <label for="read-timeout">
          <span class="setting-label">Read Timeout</span>
          <span class="setting-value">{localReadTimeout}s</span>
        </label>
        <input
          id="read-timeout"
          type="range"
          min="10"
          max="300"
          step="5"
          bind:value={localReadTimeout}
        />
        <div class="setting-description">
          {getRecommendation('read')}
        </div>
      </div>
      
      <div class="setting-item">
        <label for="write-timeout">
          <span class="setting-label">Write Timeout</span>
          <span class="setting-value">{localWriteTimeout}s</span>
        </label>
        <input
          id="write-timeout"
          type="range"
          min="10"
          max="300"
          step="5"
          bind:value={localWriteTimeout}
        />
        <div class="setting-description">
          {getRecommendation('write')}
        </div>
      </div>
    </div>
    
    <div class="setting-group">
      <h4>Retry Configuration</h4>
      
      <div class="setting-item">
        <label for="retry-attempts">
          <span class="setting-label">Retry Attempts</span>
          <span class="setting-value">{localRetryAttempts}</span>
        </label>
        <input
          id="retry-attempts"
          type="range"
          min="0"
          max="10"
          step="1"
          bind:value={localRetryAttempts}
        />
        <div class="setting-description">
          {getRecommendation('retry')}
        </div>
      </div>
      
      <div class="setting-item">
        <label for="retry-delay">
          <span class="setting-label">Initial Retry Delay</span>
          <span class="setting-value">{localRetryDelay}s</span>
        </label>
        <input
          id="retry-delay"
          type="range"
          min="0.5"
          max="10"
          step="0.5"
          bind:value={localRetryDelay}
        />
        <div class="setting-description">
          {getRecommendation('delay')}
        </div>
      </div>
      
      <div class="setting-item checkbox-item">
        <label for="auto-retry">
          <input
            id="auto-retry"
            type="checkbox"
            bind:checked={localAutoRetryEnabled}
          />
          <span class="setting-label">Enable Automatic Retries</span>
        </label>
        <div class="setting-description">
          Automatically retry failed operations for recoverable errors
        </div>
      </div>
    </div>
    
    <div class="preset-section">
      <h4>Quick Presets</h4>
      <div class="preset-buttons">
        <button
          class="preset-button"
          on:click={() => {
            localConnectionTimeout = 5;
            localReadTimeout = 15;
            localWriteTimeout = 15;
            localRetryAttempts = 5;
            localRetryDelay = 0.5;
          }}
        >
          Fast Network
        </button>
        
        <button
          class="preset-button"
          on:click={() => {
            localConnectionTimeout = 10;
            localReadTimeout = 30;
            localWriteTimeout = 30;
            localRetryAttempts = 3;
            localRetryDelay = 1;
          }}
        >
          Default
        </button>
        
        <button
          class="preset-button"
          on:click={() => {
            localConnectionTimeout = 30;
            localReadTimeout = 120;
            localWriteTimeout = 120;
            localRetryAttempts = 2;
            localRetryDelay = 3;
          }}
        >
          Slow Network
        </button>
      </div>
    </div>
  </div>
  
  <div class="settings-actions">
    <button class="action-button secondary" on:click={handleReset}>
      Reset to Defaults
    </button>
    
    <div class="primary-actions">
      <button class="action-button secondary" on:click={handleCancel}>
        Cancel
      </button>
      
      <button 
        class="action-button primary" 
        on:click={handleSave}
        disabled={!hasChanges}
      >
        Save Changes
      </button>
    </div>
  </div>
</div>

<style>
  .timeout-settings {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  
  .settings-header {
    padding: 24px 24px 16px 24px;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .settings-header h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
    color: #111827;
  }
  
  .settings-header p {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
  }
  
  .settings-content {
    padding: 24px;
  }
  
  .setting-group {
    margin-bottom: 32px;
  }
  
  .setting-group:last-child {
    margin-bottom: 0;
  }
  
  .setting-group h4 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
  }
  
  .setting-item {
    margin-bottom: 20px;
  }
  
  .setting-item:last-child {
    margin-bottom: 0;
  }
  
  .setting-item label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-weight: 500;
    color: #374151;
  }
  
  .checkbox-item label {
    justify-content: flex-start;
    gap: 8px;
  }
  
  .setting-label {
    font-size: 14px;
  }
  
  .setting-value {
    font-size: 14px;
    color: #6b7280;
    font-family: monospace;
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  input[type="range"] {
    width: 100%;
    margin-bottom: 8px;
  }
  
  input[type="checkbox"] {
    margin: 0;
  }
  
  .setting-description {
    font-size: 12px;
    color: #9ca3af;
    line-height: 1.4;
  }
  
  .preset-section {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 16px;
  }
  
  .preset-section h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }
  
  .preset-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  
  .preset-button {
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .preset-button:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
  
  .settings-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
  }
  
  .primary-actions {
    display: flex;
    gap: 12px;
  }
  
  .action-button {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid;
  }
  
  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .action-button.primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
  
  .action-button.primary:hover:not(:disabled) {
    background: #2563eb;
    border-color: #2563eb;
  }
  
  .action-button.secondary {
    background: white;
    color: #374151;
    border-color: #d1d5db;
  }
  
  .action-button.secondary:hover {
    background: #f9fafb;
  }
  
  /* Mobile responsive */
  @media (max-width: 640px) {
    .settings-header {
      padding: 16px;
    }
    
    .settings-content {
      padding: 16px;
    }
    
    .settings-actions {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }
    
    .primary-actions {
      width: 100%;
    }
    
    .action-button {
      flex: 1;
    }
    
    .preset-buttons {
      flex-direction: column;
    }
    
    .preset-button {
      width: 100%;
    }
  }
</style>