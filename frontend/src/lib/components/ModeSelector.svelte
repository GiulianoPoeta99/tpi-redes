<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { TransferMode } from '../types';

  export let selectedMode: TransferMode = 'Transmitter';
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{
    modeChange: TransferMode;
  }>();

  function handleModeChange(mode: TransferMode) {
    if (disabled) return;
    
    selectedMode = mode;
    dispatch('modeChange', mode);
  }
</script>

<div class="mode-selector" data-testid="mode-selector">
  <div class="flex justify-center space-x-4">
    <button 
      class="btn mode-btn {selectedMode === 'Transmitter' ? 'btn-primary' : 'btn-secondary'}"
      class:disabled
      data-testid="transmitter-mode"
      on:click={() => handleModeChange('Transmitter')}
      {disabled}
    >
      <span class="icon">📡</span>
      <span class="label">Transmitter</span>
    </button>
    
    <button 
      class="btn mode-btn {selectedMode === 'Receiver' ? 'btn-primary' : 'btn-secondary'}"
      class:disabled
      data-testid="receiver-mode"
      on:click={() => handleModeChange('Receiver')}
      {disabled}
    >
      <span class="icon">📥</span>
      <span class="label">Receiver</span>
    </button>
  </div>
  
  <div class="mode-description mt-4 text-center">
    {#if selectedMode === 'Transmitter'}
      <p class="text-gray-600 dark:text-gray-400">
        Send files to another machine on the network
      </p>
    {:else}
      <p class="text-gray-600 dark:text-gray-400">
        Receive files from another machine on the network
      </p>
    {/if}
  </div>
</div>

<style>
  .mode-btn {
    @apply flex flex-col items-center space-y-2 px-6 py-4 min-w-[140px];
  }
  
  .mode-btn .icon {
    @apply text-2xl;
  }
  
  .mode-btn .label {
    @apply font-medium;
  }
  
  .mode-btn.disabled {
    @apply opacity-50 cursor-not-allowed;
  }
  
  .mode-description {
    @apply text-sm;
  }
</style>