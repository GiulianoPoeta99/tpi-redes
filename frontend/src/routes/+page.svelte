<script lang="ts">
  import ModeSelector from '$lib/components/ModeSelector.svelte';
  import ConnectionConfig from '$lib/components/ConnectionConfig.svelte';
  import LoadingSkeleton from '$lib/components/LoadingSkeleton.svelte';
  import ResponsiveLayout from '$lib/components/ResponsiveLayout.svelte';
  import Tooltip from '$lib/components/Tooltip.svelte';
  import { configStore } from '$lib/stores/config';
  import type { TransferMode, TransferConfig } from '$lib/types';
  import { TransferConfigValidator } from '$lib/types';
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  // Subscribe to the config store
  let config: TransferConfig;
  configStore.subscribe(value => {
    config = value;
  });

  let isTransferring = false;
  let isLoading = true;
  let mounted = false;

  onMount(() => {
    // Simulate loading time for better UX
    setTimeout(() => {
      isLoading = false;
      mounted = true;
    }, 800);
  });

  function handleModeChange(event: CustomEvent<TransferMode>) {
    const newMode = event.detail;
    configStore.updateField('mode', newMode);
  }

  function handleConfigChange(event: CustomEvent<TransferConfig>) {
    const newConfig = event.detail;
    configStore.save(newConfig);
  }

  // Check if configuration is valid for starting transfer
  $: isConfigValid = config ? TransferConfigValidator.isValid(config) : false;
</script>

<svelte:head>
  <title>File Transfer App - Secure Socket-Based File Transfers</title>
  <meta name="description" content="Transfer files securely between computers using TCP and UDP protocols with real-time progress monitoring." />
</svelte:head>

<ResponsiveLayout>
  <div slot="default" let:isMobile let:isTablet let:isDesktop class="py-8">
    {#if isLoading}
      <!-- Loading state -->
      <div class="container-responsive">
        <div class="text-center mb-8">
          <LoadingSkeleton type="text" lines={2} />
        </div>
        
        <div class="max-w-4xl mx-auto space-y-8">
          <LoadingSkeleton type="card" lines={3} />
          <LoadingSkeleton type="card" lines={4} />
          <LoadingSkeleton type="card" lines={2} />
        </div>
      </div>
    {:else}
      <!-- Main content -->
      <div class="container-responsive" in:fade={{ duration: 600, delay: 200 }}>
        <!-- Header -->
        <header class="text-center mb-12" in:fly={{ y: -20, duration: 600, delay: 400 }}>
          <h1 class="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            File Transfer Application
          </h1>
          <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Secure socket-based file transfers with TCP and UDP support, featuring real-time progress monitoring and integrity verification
          </p>
          
          <!-- Quick stats -->
          <div class="flex justify-center space-x-8 mt-6 text-sm text-gray-500 dark:text-gray-400">
            <div class="flex items-center space-x-1">
              <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span>SHA-256 Integrity</span>
            </div>
            <div class="flex items-center space-x-1">
              <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
              </svg>
              <span>TCP & UDP Support</span>
            </div>
            <div class="flex items-center space-x-1">
              <svg class="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
              </svg>
              <span>Real-time Progress</span>
            </div>
          </div>
        </header>

        <div class="max-w-6xl mx-auto">
          <!-- Main content grid -->
          <div class="grid-responsive" class:grid-cols-1={isMobile} class:grid-cols-2={isTablet} class:grid-cols-3={isDesktop}>
            
            <!-- Mode Selection -->
            <div class="card card-interactive p-6" in:fly={{ y: 20, duration: 600, delay: 600 }}>
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  Transfer Mode
                </h2>
                <Tooltip text="Choose whether to send or receive files">
                  <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                  </svg>
                </Tooltip>
              </div>
              
              <ModeSelector 
                selectedMode={config?.mode || 'Transmitter'}
                disabled={isTransferring}
                on:modeChange={handleModeChange}
              />
            </div>

            <!-- Connection Configuration -->
            <div class="card p-6 {isDesktop ? 'col-span-2' : ''}" in:fly={{ y: 20, duration: 600, delay: 700 }}>
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  Network Configuration
                </h2>
                <Tooltip text="Configure IP address, port, and protocol settings">
                  <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 4a1 1 0 000 2h8.905l-.651.651a1 1 0 101.414 1.414L15.414 6a1 1 0 000-1.414L12.668 1.84a1 1 0 10-1.414 1.414l.651.651H3a1 1 0 000 2zm9.095 8H20a1 1 0 100-2h-7.905l.651-.651a1 1 0 00-1.414-1.414L8.586 10a1 1 0 000 1.414l2.746 2.746a1 1 0 101.414-1.414L12.095 12z" clip-rule="evenodd" />
                  </svg>
                </Tooltip>
              </div>
              
              {#if config}
                <ConnectionConfig 
                  {config}
                  disabled={isTransferring}
                  on:configChange={handleConfigChange}
                />
              {:else}
                <LoadingSkeleton type="text" lines={3} />
              {/if}
            </div>

            <!-- File Selection Placeholder -->
            <div class="card p-6 {isDesktop ? 'col-span-2' : ''}" in:fly={{ y: 20, duration: 600, delay: 800 }}>
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  File Selection
                </h2>
                <span class="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full">
                  Coming Soon
                </span>
              </div>
              
              <div class="text-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 transition-colors duration-200">
                <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p class="text-gray-500 dark:text-gray-400 mb-2 font-medium">
                  Drag & Drop File Selection
                </p>
                <p class="text-sm text-gray-400 dark:text-gray-500 mb-4">
                  File selection component will be implemented in task 12
                </p>
                
                {#if config}
                  <div class="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div class="font-mono">
                      Mode: <span class="text-primary-600 dark:text-primary-400">{config.mode}</span> • 
                      Protocol: <span class="text-primary-600 dark:text-primary-400">{config.protocol}</span>
                      {#if config.mode === 'Transmitter' && config.target_ip}
                        • Target: <span class="text-primary-600 dark:text-primary-400">{config.target_ip}:{config.port}</span>
                      {:else if config.mode === 'Receiver'}
                        • Listening: <span class="text-primary-600 dark:text-primary-400">:{config.port}</span>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Transfer Controls -->
            <div class="card p-6" in:fly={{ y: 20, duration: 600, delay: 900 }}>
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Transfer Controls
              </h2>
              
              <div class="space-y-4">
                <Tooltip text={!isConfigValid ? "Please fix configuration errors first" : "Start the file transfer"}>
                  <button 
                    class="btn btn-primary w-full"
                    class:btn-loading={isTransferring}
                    disabled={!isConfigValid || isTransferring}
                  >
                    {#if isTransferring}
                      <div class="spinner mr-2"></div>
                      Transferring...
                    {:else if config?.mode === 'Transmitter'}
                      <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                      Start Transfer
                    {:else}
                      <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                      Start Listening
                    {/if}
                  </button>
                </Tooltip>
                
                {#if !isConfigValid && config}
                  <div class="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800" in:fade>
                    <div class="flex items-start space-x-2">
                      <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                      <div>
                        <p class="font-medium">Configuration Issues</p>
                        <p>Please fix configuration errors before starting transfer</p>
                      </div>
                    </div>
                  </div>
                {/if}
                
                <div class="text-xs text-gray-500 dark:text-gray-400 text-center bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                  <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                  </svg>
                  Transfer functionality will be implemented in tasks 13-14
                </div>
              </div>
            </div>
          </div>

          <!-- Help section -->
          <div class="mt-12 text-center" in:fly={{ y: 20, duration: 600, delay: 1000 }}>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Need help? Press <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">F1</kbd> for keyboard shortcuts
              or <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">Ctrl+H</kbd> for the tour
            </p>
          </div>
        </div>
      </div>
    {/if}
  </div>
</ResponsiveLayout>