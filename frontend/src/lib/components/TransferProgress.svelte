<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import type { TransferProgress as TransferProgressType, TransferStatus } from '../types';
  import { TransferUtils } from '../types';
  import { cancelTransfer } from '../tauri-commands';

  // Props
  export let transferProgress: TransferProgressType | null = null;
  export let showControls: boolean = true;
  export let allowCancel: boolean = true;
  export let allowPause: boolean = false; // Pause functionality not implemented in backend yet

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    cancel: { transferId: string };
    pause: { transferId: string };
    resume: { transferId: string };
  }>();

  // Local state
  let isVisible = false;
  let isPaused = false;
  let cancelling = false;

  // Reactive statements
  $: isActive = transferProgress && TransferUtils.isActiveStatus(transferProgress.status);
  $: isCompleted = transferProgress && transferProgress.status === 'Completed';
  $: isError = transferProgress && transferProgress.status === 'Error';
  $: isCancelled = transferProgress && transferProgress.status === 'Cancelled';
  $: isTerminal = transferProgress && TransferUtils.isTerminalStatus(transferProgress.status);
  
  // Progress calculations
  $: progressPercentage = transferProgress ? Math.round(transferProgress.progress * 100) : 0;
  $: formattedSpeed = transferProgress ? TransferUtils.formatSpeed(transferProgress.speed) : '0 B/s';
  $: formattedEta = transferProgress && transferProgress.eta > 0 ? TransferUtils.formatDuration(transferProgress.eta) : 'Unknown';
  $: formattedBytesTransferred = transferProgress ? TransferUtils.formatBytes(transferProgress.bytes_transferred) : '0 B';
  $: formattedTotalBytes = transferProgress ? TransferUtils.formatBytes(transferProgress.total_bytes) : '0 B';

  // Status display helpers
  $: statusText = getStatusText(transferProgress?.status);
  $: statusClass = getStatusClass(transferProgress?.status);

  function getStatusText(status: TransferStatus | undefined): string {
    switch (status) {
      case 'Idle': return 'Ready';
      case 'Connecting': return 'Connecting...';
      case 'Transferring': return 'Transferring';
      case 'Completed': return 'Completed';
      case 'Error': return 'Error';
      case 'Cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  }

  function getStatusClass(status: TransferStatus | undefined): string {
    switch (status) {
      case 'Idle': return 'status-idle';
      case 'Connecting': return 'status-connecting';
      case 'Transferring': return 'status-transferring';
      case 'Completed': return 'status-completed';
      case 'Error': return 'status-error';
      case 'Cancelled': return 'status-cancelled';
      default: return 'status-unknown';
    }
  }

  async function handleCancel() {
    if (!transferProgress || cancelling) return;
    
    try {
      cancelling = true;
      await cancelTransfer(transferProgress.transfer_id);
      dispatch('cancel', { transferId: transferProgress.transfer_id });
    } catch (error) {
      console.error('Failed to cancel transfer:', error);
      // Error will be handled by parent component through event system
    } finally {
      cancelling = false;
    }
  }

  function handlePause() {
    if (!transferProgress) return;
    isPaused = !isPaused;
    
    if (isPaused) {
      dispatch('pause', { transferId: transferProgress.transfer_id });
    } else {
      dispatch('resume', { transferId: transferProgress.transfer_id });
    }
  }

  // Show/hide animation
  $: if (transferProgress) {
    isVisible = true;
  }

  onMount(() => {
    if (transferProgress) {
      isVisible = true;
    }
  });
</script>

{#if transferProgress && isVisible}
  <div class="transfer-progress" class:visible={isVisible} data-testid="transfer-progress">
    <!-- Status Header -->
    <div class="status-header">
      <div class="status-indicator {statusClass}" data-testid="status-indicator">
        <span class="status-dot"></span>
        <span class="status-text">{statusText}</span>
      </div>
      
      {#if transferProgress.error}
        <div class="error-message" data-testid="error-message">
          {transferProgress.error}
        </div>
      {/if}
    </div>

    <!-- Progress Bar -->
    <div class="progress-section">
      <div class="progress-info">
        <span class="progress-percentage" data-testid="progress-percentage">
          {progressPercentage}%
        </span>
        <span class="progress-bytes" data-testid="progress-bytes">
          {formattedBytesTransferred} / {formattedTotalBytes}
        </span>
      </div>
      
      <div class="progress-bar-container" data-testid="progress-bar-container">
        <div 
          class="progress-bar" 
          class:error={isError}
          class:completed={isCompleted}
          class:cancelled={isCancelled}
          style="width: {progressPercentage}%"
          data-testid="progress-bar"
        ></div>
      </div>
    </div>

    <!-- Transfer Metrics -->
    {#if isActive}
      <div class="metrics-section">
        <div class="metric">
          <span class="metric-label">Speed:</span>
          <span class="metric-value" data-testid="transfer-speed">{formattedSpeed}</span>
        </div>
        
        <div class="metric">
          <span class="metric-label">ETA:</span>
          <span class="metric-value" data-testid="transfer-eta">{formattedEta}</span>
        </div>
      </div>
    {/if}

    <!-- Transfer Controls -->
    {#if showControls && isActive}
      <div class="controls-section">
        {#if allowPause}
          <button 
            class="control-button pause-button"
            class:paused={isPaused}
            on:click={handlePause}
            data-testid="pause-button"
          >
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
        {/if}
        
        {#if allowCancel}
          <button 
            class="control-button cancel-button"
            class:cancelling
            disabled={cancelling}
            on:click={handleCancel}
            data-testid="cancel-button"
          >
            {cancelling ? 'Cancelling...' : '❌ Cancel'}
          </button>
        {/if}
      </div>
    {/if}

    <!-- Completion Notification -->
    {#if isCompleted}
      <div class="completion-notification success" data-testid="completion-notification">
        ✅ Transfer completed successfully!
      </div>
    {:else if isError}
      <div class="completion-notification error" data-testid="completion-notification">
        ❌ Transfer failed: {transferProgress.error || 'Unknown error'}
      </div>
    {:else if isCancelled}
      <div class="completion-notification cancelled" data-testid="completion-notification">
        🚫 Transfer was cancelled
      </div>
    {/if}
  </div>
{/if}

<style>
  .transfer-progress {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    margin: 1rem 0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    opacity: 0;
    transform: translateY(20px) scale(0.95);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
    position: relative;
    overflow: hidden;
  }

  .transfer-progress::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #3b82f6, transparent);
    animation: shimmer 2s infinite;
  }

  .transfer-progress.visible {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }

  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .status-idle .status-dot {
    background-color: #64748b;
  }

  .status-connecting .status-dot {
    background-color: #f59e0b;
  }

  .status-transferring .status-dot {
    background-color: #3b82f6;
  }

  .status-completed .status-dot {
    background-color: #10b981;
    animation: none;
  }

  .status-error .status-dot {
    background-color: #ef4444;
    animation: none;
  }

  .status-cancelled .status-dot {
    background-color: #6b7280;
    animation: none;
  }

  .error-message {
    color: #ef4444;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .progress-section {
    margin-bottom: 1rem;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .progress-percentage {
    font-weight: 600;
    color: #1f2937;
  }

  .progress-bytes {
    color: #6b7280;
  }

  .progress-bar-container {
    width: 100%;
    height: 8px;
    background-color: #f1f5f9;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    border-radius: 4px;
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .progress-bar::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: progress-shimmer 1.5s infinite;
  }

  @keyframes progress-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .progress-bar.completed {
    background-color: #10b981;
  }

  .progress-bar.error {
    background-color: #ef4444;
  }

  .progress-bar.cancelled {
    background-color: #6b7280;
  }

  .metrics-section {
    display: flex;
    gap: 2rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background-color: #f8fafc;
    border-radius: 6px;
  }

  .metric {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .metric-label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    font-weight: 500;
  }

  .metric-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1f2937;
  }

  .controls-section {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .control-button {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background-color: white;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: scale(1);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }

  .control-button:hover:not(:disabled) {
    background-color: #f9fafb;
    border-color: #9ca3af;
    transform: scale(1.05);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .control-button:active:not(:disabled) {
    transform: scale(0.95);
  }

  .control-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pause-button.paused {
    background-color: #fef3c7;
    border-color: #f59e0b;
    color: #92400e;
  }

  .cancel-button {
    background-color: #fef2f2;
    border-color: #fecaca;
    color: #dc2626;
  }

  .cancel-button:hover:not(:disabled) {
    background-color: #fee2e2;
    border-color: #fca5a5;
  }

  .cancel-button.cancelling {
    background-color: #f3f4f6;
    color: #6b7280;
  }

  .completion-notification {
    padding: 0.75rem;
    border-radius: 6px;
    font-weight: 500;
    text-align: center;
    margin-top: 1rem;
  }

  .completion-notification.success {
    background-color: #d1fae5;
    color: #065f46;
    border: 1px solid #a7f3d0;
  }

  .completion-notification.error {
    background-color: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  }

  .completion-notification.cancelled {
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .transfer-progress {
      padding: 1rem;
    }

    .metrics-section {
      flex-direction: column;
      gap: 1rem;
    }

    .controls-section {
      flex-direction: column;
    }

    .control-button {
      width: 100%;
    }
  }
</style>