<script lang="ts">
  import ModeSelector from '$lib/components/ModeSelector.svelte';
  import ConnectionConfig from '$lib/components/ConnectionConfig.svelte';
  import { configStore } from '$lib/stores/config';
  import type { TransferMode, TransferConfig } from '$lib/types';
  import { TransferConfigValidator } from '$lib/types';

  // Subscribe to the config store
  let config: TransferConfig;
  configStore.subscribe(value => {
    config = value;
  });

  let isTransferring = false;

  function handleModeChange(event: CustomEvent<TransferMode>) {
    const newMode = event.detail;
    configStore.updateField('mode', newMode);
  }

  function handleConfigChange(event: CustomEvent<TransferConfig>) {
    const newConfig = event.detail;
    // Update the entire config
    configStore.save(newConfig);
  }

  // Check if configuration is valid for starting transfer
  $: isConfigValid = config ? TransferConfigValidator.isValid(config) : false;
</script>

<div class="container mx-auto px-4 py-8">
  <header class="text-center mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
      File Transfer Application
    </h1>
    <p class="text-gray-600 dark:text-gray-400">
      Secure socket-based file transfers with TCP and UDP support
    </p>
  </header>

  <div class="max-w-4xl mx-auto space-y-8">
    <!-- Mode Selection -->
    <div class="card p-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
        Select Transfer Mode
      </h2>
      
      <ModeSelector 
        selectedMode={config?.mode || 'Transmitter'}
        disabled={isTransferring}
        on:modeChange={handleModeChange}
      />
    </div>

    <!-- Connection Configuration -->
    {#if config}
      <div class="card p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Connection Configuration
        </h2>
        
        <ConnectionConfig 
          {config}
          disabled={isTransferring}
          on:configChange={handleConfigChange}
        />
      </div>
    {/if}

    <!-- File Selection Placeholder -->
    <div class="card p-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        File Selection
      </h2>
      
      <div class="text-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          File selection component will be implemented in task 12
        </p>
        <div class="text-sm text-gray-400 dark:text-gray-500">
          Current configuration: {config?.mode} mode, {config?.protocol} protocol
          {#if config?.mode === 'Transmitter' && config?.target_ip}
            → {config.target_ip}:{config.port}
          {:else if config?.mode === 'Receiver'}
            listening on port {config.port}
          {/if}
        </div>
      </div>
    </div>

    <!-- Transfer Controls Placeholder -->
    <div class="card p-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Transfer Controls
      </h2>
      
      <div class="text-center">
        <button 
          class="btn btn-primary"
          disabled={!isConfigValid || isTransferring}
        >
          {#if isTransferring}
            Transferring...
          {:else if config?.mode === 'Transmitter'}
            Start Transfer
          {:else}
            Start Listening
          {/if}
        </button>
        
        {#if !isConfigValid && config}
          <p class="text-sm text-red-600 dark:text-red-400 mt-2">
            Please fix configuration errors before starting transfer
          </p>
        {/if}
        
        <div class="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Transfer functionality will be implemented in tasks 13-14
        </div>
      </div>
    </div>
  </div>
</div>