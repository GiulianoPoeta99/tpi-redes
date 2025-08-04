<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { TransferConfig, TransferMode, Protocol } from '../types';
  import { TransferConfigValidator } from '../types';

  export let config: TransferConfig;
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{
    configChange: TransferConfig;
  }>();

  let validationErrors: string[] = [];
  let ipError: string = '';
  let portError: string = '';

  // Reactive validation
  $: {
    validateInputs();
    dispatch('configChange', config);
  }

  function validateInputs() {
    validationErrors = TransferConfigValidator.validate(config);
    
    // Specific field validation for UI feedback
    ipError = '';
    portError = '';
    
    if (config.mode === 'Transmitter' && config.target_ip) {
      if (!TransferConfigValidator.isValidIpAddress(config.target_ip)) {
        ipError = 'Invalid IP address format';
      }
    }
    
    if (config.port <= 0 || config.port > 65535) {
      portError = 'Port must be between 1 and 65535';
    }
  }

  function handleModeChange(mode: TransferMode) {
    config = { ...config, mode };
    if (mode === 'Receiver') {
      config.target_ip = undefined;
    }
  }

  function handleProtocolChange(protocol: Protocol) {
    config = { ...config, protocol };
  }

  function handleTargetIpChange(event: Event) {
    const target = event.target as HTMLInputElement;
    config = { ...config, target_ip: target.value || undefined };
  }

  function handlePortChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const port = parseInt(target.value) || 0;
    config = { ...config, port };
  }

  function resetToDefaults() {
    config = {
      mode: 'Transmitter',
      protocol: 'Tcp',
      target_ip: undefined,
      port: 8080,
      filename: undefined,
      chunk_size: 8192,
      timeout: 30,
    };
  }
</script>

<div class="connection-config" data-testid="connection-config">
  <div class="space-y-6">
    <!-- Protocol Selection -->
    <div class="form-group">
      <label for="protocol" class="form-label">
        Protocol
      </label>
      <select 
        id="protocol"
        class="form-select"
        class:error={validationErrors.some(e => e.includes('protocol'))}
        data-testid="protocol-select"
        bind:value={config.protocol}
        on:change={(e) => handleProtocolChange((e.target as HTMLSelectElement).value as Protocol)}
        {disabled}
      >
        <option value="Tcp">TCP (Reliable)</option>
        <option value="Udp">UDP (Fast)</option>
      </select>
      <p class="form-help">
        {#if config.protocol === 'Tcp'}
          TCP provides reliable, ordered delivery with acknowledgments
        {:else}
          UDP provides fast, fire-and-forget delivery without guarantees
        {/if}
      </p>
    </div>

    <!-- Target IP (only for Transmitter mode) -->
    {#if config.mode === 'Transmitter'}
      <div class="form-group">
        <label for="target-ip" class="form-label required">
          Target IP Address
        </label>
        <input 
          id="target-ip"
          type="text"
          class="form-input"
          class:error={ipError}
          data-testid="target-ip"
          placeholder="192.168.1.100 or localhost"
          value={config.target_ip || ''}
          on:input={handleTargetIpChange}
          {disabled}
        />
        {#if ipError}
          <p class="form-error">{ipError}</p>
        {:else}
          <p class="form-help">IP address of the receiving machine</p>
        {/if}
      </div>
    {/if}

    <!-- Port -->
    <div class="form-group">
      <label for="port" class="form-label required">
        {config.mode === 'Transmitter' ? 'Target Port' : 'Listening Port'}
      </label>
      <input 
        id="port"
        type="number"
        class="form-input"
        class:error={portError}
        data-testid="port"
        placeholder="8080"
        min="1"
        max="65535"
        bind:value={config.port}
        on:input={handlePortChange}
        {disabled}
      />
      {#if portError}
        <p class="form-error">{portError}</p>
      {:else}
        <p class="form-help">
          {config.mode === 'Transmitter' 
            ? 'Port number on the receiving machine' 
            : 'Port number to listen on for incoming connections'}
        </p>
      {/if}
    </div>

    <!-- Advanced Settings -->
    <details class="advanced-settings">
      <summary class="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
        Advanced Settings
      </summary>
      <div class="mt-4 space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
        <!-- Chunk Size -->
        <div class="form-group">
          <label for="chunk-size" class="form-label">
            Chunk Size (bytes)
          </label>
          <input 
            id="chunk-size"
            type="number"
            class="form-input"
            data-testid="chunk-size"
            min="1024"
            max="1048576"
            bind:value={config.chunk_size}
            {disabled}
          />
          <p class="form-help">
            Size of data chunks for transfer (1KB - 1MB)
          </p>
        </div>

        <!-- Timeout -->
        <div class="form-group">
          <label for="timeout" class="form-label">
            Timeout (seconds)
          </label>
          <input 
            id="timeout"
            type="number"
            class="form-input"
            data-testid="timeout"
            min="5"
            max="3600"
            bind:value={config.timeout}
            {disabled}
          />
          <p class="form-help">
            Connection and transfer timeout (5s - 1h)
          </p>
        </div>
      </div>
    </details>

    <!-- Reset Button -->
    <div class="flex justify-end">
      <button 
        class="btn btn-secondary"
        data-testid="reset-config"
        on:click={resetToDefaults}
        disabled={disabled}
      >
        Reset to Defaults
      </button>
    </div>

    <!-- Validation Summary -->
    {#if validationErrors.length > 0}
      <div class="validation-summary" data-testid="validation-errors">
        <h4 class="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
          Configuration Issues:
        </h4>
        <ul class="text-sm text-red-600 dark:text-red-400 space-y-1">
          {#each validationErrors as error}
            <li>• {error}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</div>

<style>
  .form-group {
    @apply space-y-2;
  }
  
  .form-label {
    @apply block text-sm font-medium text-gray-700 dark:text-gray-300;
  }
  
  .form-label.required::after {
    content: ' *';
    @apply text-red-500;
  }
  
  .form-input, .form-select {
    @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm;
    @apply bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100;
    @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
    @apply disabled:opacity-50 disabled:cursor-not-allowed;
  }
  
  .form-input.error, .form-select.error {
    @apply border-red-500 focus:ring-red-500 focus:border-red-500;
  }
  
  .form-help {
    @apply text-xs text-gray-500 dark:text-gray-400;
  }
  
  .form-error {
    @apply text-xs text-red-600 dark:text-red-400;
  }
  
  .advanced-settings {
    @apply border border-gray-200 dark:border-gray-700 rounded-md p-4;
  }
  
  .validation-summary {
    @apply bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4;
  }
</style>