<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher<{
    shortcut: string;
  }>();
  
  export let shortcuts: Record<string, string> = {
    'ctrl+o': 'Open file',
    'ctrl+s': 'Start transfer',
    'ctrl+r': 'Reset configuration',
    'ctrl+h': 'Show help',
    'escape': 'Cancel operation',
    'f1': 'Show shortcuts'
  };
  
  export let disabled: boolean = false;
  
  let showHelp = false;
  
  function handleKeydown(event: KeyboardEvent) {
    if (disabled) return;
    
    const key = event.key.toLowerCase();
    const ctrl = event.ctrlKey || event.metaKey;
    const alt = event.altKey;
    const shift = event.shiftKey;
    
    let shortcut = '';
    if (ctrl) shortcut += 'ctrl+';
    if (alt) shortcut += 'alt+';
    if (shift) shortcut += 'shift+';
    shortcut += key;
    
    if (shortcuts[shortcut]) {
      event.preventDefault();
      
      if (shortcut === 'f1') {
        showHelp = !showHelp;
      } else if (shortcut === 'escape') {
        showHelp = false;
      } else {
        dispatch('shortcut', shortcut);
      }
    }
  }
  
  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });
  
  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

<!-- Keyboard shortcuts help overlay -->
{#if showHelp}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    on:click={() => showHelp = false}
    on:keydown={(e) => e.key === 'Escape' && (showHelp = false)}
    role="dialog"
    aria-modal="true"
    aria-labelledby="shortcuts-title"
    tabindex="-1"
  >
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div 
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="document"
    >
      <div class="flex items-center justify-between mb-4">
        <h2 id="shortcuts-title" class="text-lg font-semibold text-gray-900 dark:text-white">
          Keyboard Shortcuts
        </h2>
        <button 
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          on:click={() => showHelp = false}
          aria-label="Close shortcuts help"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="space-y-3">
        {#each Object.entries(shortcuts) as [shortcut, description]}
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">{description}</span>
            <kbd class="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded border">
              {shortcut.replace('ctrl+', '⌘').replace('alt+', '⌥').replace('shift+', '⇧')}
            </kbd>
          </div>
        {/each}
      </div>
      
      <div class="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
        Press <kbd class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">F1</kbd> to toggle this help
      </div>
    </div>
  </div>
{/if}