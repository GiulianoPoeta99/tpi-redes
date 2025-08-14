<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { TransferError } from '../error-handling';
  import { ErrorRecovery } from '../error-handling';
  
  export let error: TransferError;
  export let visible: boolean = false;
  export let retryCount: number = 0;
  export let maxRetries: number = 3;
  
  const dispatch = createEventDispatcher<{
    retry: void;
    cancel: void;
    configure: void;
    close: void;
  }>();
  
  let selectedAction: string = 'retry';
  let customTimeout: number = 30;
  let autoRetryEnabled: boolean = true;
  
  $: canRetry = error.recoverable && retryCount < maxRetries;
  $: recoverySuggestion = ErrorRecovery.getRecoverySuggestion(error.code, error.context);
  $: timeoutRecommendation = ErrorRecovery.getTimeoutRecommendation(error.code, error.context);
  
  function handleRetry() {
    dispatch('retry');
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
  
  function handleConfigure() {
    dispatch('configure');
  }
  
  function handleClose() {
    visible = false;
    dispatch('close');
  }
  
  function getErrorSeverityClass(errorCode: string): string {
    switch (errorCode) {
      case 'NETWORK_ERROR':
      case 'CONNECTION_REFUSED':
      case 'TIMEOUT':
        return 'warning';
      case 'CHECKSUM_MISMATCH':
      case 'CORRUPTED_DATA':
        return 'error';
      case 'CANCELLED':
        return 'info';
      default:
        return 'error';
    }
  }
  
  function getErrorIcon(errorCode: string): string {
    switch (errorCode) {
      case 'NETWORK_ERROR':
      case 'CONNECTION_REFUSED':
        return '🌐';
      case 'TIMEOUT':
        return '⏱️';
      case 'CHECKSUM_MISMATCH':
      case 'CORRUPTED_DATA':
        return '⚠️';
      case 'FILE_ERROR':
      case 'FILE_NOT_FOUND':
        return '📁';
      case 'PERMISSION_DENIED':
        return '🔒';
      case 'INSUFFICIENT_SPACE':
        return '💾';
      case 'CANCELLED':
        return '⏹️';
      default:
        return '❌';
    }
  }
</script>

{#if visible}
  <div class="error-dialog-overlay" on:click={handleClose} role="dialog" aria-modal="true">
    <div class="error-dialog" on:click|stopPropagation class:warning={getErrorSeverityClass(error.code) === 'warning'} class:error={getErrorSeverityClass(error.code) === 'error'} class:info={getErrorSeverityClass(error.code) === 'info'}>
      <div class="error-header">
        <div class="error-icon">
          {getErrorIcon(error.code)}
        </div>
        <div class="error-title">
          <h3>{ErrorRecovery.getUserFriendlyMessage(error.code)}</h3>
          <p class="error-code">Error Code: {error.code}</p>
        </div>
        <button class="close-button" on:click={handleClose} aria-label="Close dialog">
          ✕
        </button>
      </div>
      
      <div class="error-content">
        <div class="error-message">
          {error.message}
        </div>
        
        {#if error.context}
          <div class="error-context">
            <strong>Context:</strong> {error.context}
          </div>
        {/if}
        
        {#if recoverySuggestion}
          <div class="recovery-suggestion">
            <div class="suggestion-header">
              💡 <strong>Suggestion:</strong>
            </div>
            <p>{recoverySuggestion}</p>
          </div>
        {/if}
        
        {#if timeoutRecommendation}
          <div class="timeout-recommendation">
            <div class="recommendation-header">
              ⚙️ <strong>Configuration:</strong>
            </div>
            <p>{timeoutRecommendation}</p>
          </div>
        {/if}
        
        {#if retryCount > 0}
          <div class="retry-info">
            <p>Retry attempt: {retryCount} of {maxRetries}</p>
            <div class="retry-progress">
              <div class="retry-bar" style="width: {(retryCount / maxRetries) * 100}%"></div>
            </div>
          </div>
        {/if}
        
        {#if canRetry}
          <div class="recovery-options">
            <h4>Recovery Options:</h4>
            
            <label class="option-label">
              <input type="radio" bind:group={selectedAction} value="retry" />
              <span>Retry immediately</span>
            </label>
            
            <label class="option-label">
              <input type="radio" bind:group={selectedAction} value="retry-delay" />
              <span>Retry with delay</span>
            </label>
            
            {#if ['TIMEOUT', 'NETWORK_ERROR'].includes(error.code)}
              <label class="option-label">
                <input type="radio" bind:group={selectedAction} value="configure" />
                <span>Adjust timeout settings</span>
              </label>
              
              {#if selectedAction === 'configure'}
                <div class="timeout-config">
                  <label>
                    Custom timeout (seconds):
                    <input type="number" bind:value={customTimeout} min="5" max="300" />
                  </label>
                </div>
              {/if}
            {/if}
            
            <label class="option-label">
              <input type="checkbox" bind:checked={autoRetryEnabled} />
              <span>Enable automatic retries for similar errors</span>
            </label>
          </div>
        {/if}
      </div>
      
      <div class="error-actions">
        {#if canRetry}
          <button class="action-button primary" on:click={handleRetry}>
            {selectedAction === 'configure' ? 'Apply & Retry' : 'Retry'}
          </button>
        {/if}
        
        {#if ['TIMEOUT', 'NETWORK_ERROR'].includes(error.code)}
          <button class="action-button secondary" on:click={handleConfigure}>
            Settings
          </button>
        {/if}
        
        <button class="action-button secondary" on:click={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .error-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }
  
  .error-dialog {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    border-left: 4px solid;
  }
  
  .error-dialog.warning {
    border-left-color: #f59e0b;
  }
  
  .error-dialog.error {
    border-left-color: #ef4444;
  }
  
  .error-dialog.info {
    border-left-color: #3b82f6;
  }
  
  .error-header {
    display: flex;
    align-items: flex-start;
    padding: 24px 24px 16px 24px;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .error-icon {
    font-size: 24px;
    margin-right: 16px;
    flex-shrink: 0;
  }
  
  .error-title {
    flex: 1;
  }
  
  .error-title h3 {
    margin: 0 0 4px 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }
  
  .error-code {
    margin: 0;
    font-size: 12px;
    color: #6b7280;
    font-family: monospace;
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #9ca3af;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
  }
  
  .close-button:hover {
    background: #f3f4f6;
    color: #6b7280;
  }
  
  .error-content {
    padding: 24px;
  }
  
  .error-message {
    font-size: 16px;
    color: #374151;
    margin-bottom: 16px;
    line-height: 1.5;
  }
  
  .error-context {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 16px;
    font-size: 14px;
    color: #6b7280;
    font-family: monospace;
  }
  
  .recovery-suggestion {
    background: #fffbeb;
    border: 1px solid #fbbf24;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .suggestion-header {
    font-weight: 600;
    color: #92400e;
    margin-bottom: 8px;
  }
  
  .recovery-suggestion p {
    margin: 0;
    color: #92400e;
    line-height: 1.4;
  }
  
  .timeout-recommendation {
    background: #eff6ff;
    border: 1px solid #3b82f6;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .recommendation-header {
    font-weight: 600;
    color: #1d4ed8;
    margin-bottom: 8px;
  }
  
  .timeout-recommendation p {
    margin: 0;
    color: #1d4ed8;
    line-height: 1.4;
  }
  
  .retry-info {
    background: #f3f4f6;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 16px;
  }
  
  .retry-info p {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #6b7280;
  }
  
  .retry-progress {
    background: #e5e7eb;
    border-radius: 4px;
    height: 6px;
    overflow: hidden;
  }
  
  .retry-bar {
    background: #3b82f6;
    height: 100%;
    transition: width 0.3s ease;
  }
  
  .recovery-options {
    margin-bottom: 16px;
  }
  
  .recovery-options h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
  }
  
  .option-label {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .option-label:hover {
    background: #f9fafb;
  }
  
  .option-label input[type="radio"],
  .option-label input[type="checkbox"] {
    margin-right: 8px;
  }
  
  .timeout-config {
    margin-left: 24px;
    margin-top: 8px;
    padding: 12px;
    background: #f9fafb;
    border-radius: 4px;
  }
  
  .timeout-config label {
    display: block;
    font-size: 14px;
    color: #374151;
  }
  
  .timeout-config input {
    margin-top: 4px;
    padding: 6px 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    width: 100px;
  }
  
  .error-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 16px 24px 24px 24px;
    border-top: 1px solid #e5e7eb;
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
  
  .action-button.primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
  
  .action-button.primary:hover {
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
    .error-dialog-overlay {
      padding: 10px;
    }
    
    .error-dialog {
      max-height: 90vh;
    }
    
    .error-header {
      padding: 16px;
    }
    
    .error-content {
      padding: 16px;
    }
    
    .error-actions {
      flex-direction: column;
      padding: 16px;
    }
    
    .action-button {
      width: 100%;
      justify-content: center;
    }
  }
</style>