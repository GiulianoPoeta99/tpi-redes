<script lang="ts">
  // Main application page - implementation will be added in later tasks
  let selectedMode: 'transmitter' | 'receiver' = 'transmitter';
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

  <div class="max-w-4xl mx-auto">
    <div class="card p-6">
      <div class="text-center">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Select Transfer Mode
        </h2>
        
        <div class="flex justify-center space-x-4 mb-6">
          <button 
            class="btn {selectedMode === 'transmitter' ? 'btn-primary' : 'btn-secondary'}"
            on:click={() => selectedMode = 'transmitter'}
          >
            📡 Transmitter
          </button>
          <button 
            class="btn {selectedMode === 'receiver' ? 'btn-primary' : 'btn-secondary'}"
            on:click={() => selectedMode = 'receiver'}
          >
            📥 Receiver
          </button>
        </div>
        
        <div class="text-gray-600 dark:text-gray-400">
          {#if selectedMode === 'transmitter'}
            <p>Send files to another machine</p>
          {:else}
            <p>Receive files from another machine</p>
          {/if}
        </div>
        
        <div class="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p class="text-sm text-blue-700 dark:text-blue-300">
            UI components will be implemented in tasks 10-13
          </p>
        </div>
      </div>
    </div>
  </div>
</div>