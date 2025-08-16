<script lang="ts">
  import '../app.css';
  import NotificationContainer from '$lib/components/NotificationContainer.svelte';
  import KeyboardShortcuts from '$lib/components/KeyboardShortcuts.svelte';
  import OnboardingTour from '$lib/components/OnboardingTour.svelte';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  let showOnboarding = false;
  let darkMode = false;
  
  // Check for first-time user
  onMount(() => {
    if (browser) {
      const hasSeenOnboarding = localStorage.getItem('onboarding-completed');
      showOnboarding = !hasSeenOnboarding;
      
      // Initialize dark mode
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      darkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
      updateTheme();
      
      // Listen for system theme changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
          darkMode = e.matches;
          updateTheme();
        }
      });
    }
  });
  
  function updateTheme() {
    if (browser) {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }
  
  function handleShortcut(event: CustomEvent<string>) {
    const shortcut = event.detail;
    
    switch (shortcut) {
      case 'ctrl+h':
        showOnboarding = true;
        break;
      case 'ctrl+d':
        toggleDarkMode();
        break;
      // Add more shortcuts as needed
    }
  }
  
  function toggleDarkMode() {
    darkMode = !darkMode;
    updateTheme();
    if (browser) {
      localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }
  }
  
  function handleOnboardingComplete() {
    showOnboarding = false;
  }
  
  function handleOnboardingSkip() {
    showOnboarding = false;
    if (browser) {
      localStorage.setItem('onboarding-completed', 'true');
    }
  }
</script>

<div class="app-container theme-transition">
  <!-- Theme toggle button -->
  <button 
    class="fixed top-4 right-4 z-30 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-110 transition-all duration-200"
    on:click={toggleDarkMode}
    aria-label="Toggle dark mode"
  >
    {#if darkMode}
      <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
      </svg>
    {:else}
      <svg class="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
    {/if}
  </button>

  <main class="min-h-screen bg-gray-50 dark:bg-gray-900 theme-transition">
    <slot />
  </main>

  <!-- Global components -->
  <NotificationContainer />
  <KeyboardShortcuts 
    shortcuts={{
      'ctrl+o': 'Open file',
      'ctrl+s': 'Start transfer',
      'ctrl+r': 'Reset configuration',
      'ctrl+h': 'Show help',
      'ctrl+d': 'Toggle dark mode',
      'escape': 'Cancel operation',
      'f1': 'Show shortcuts'
    }}
    on:shortcut={handleShortcut}
  />
  <OnboardingTour 
    bind:show={showOnboarding}
    on:complete={handleOnboardingComplete}
    on:skip={handleOnboardingSkip}
  />
</div>

<style>
  .app-container {
    position: relative;
    min-height: 100vh;
  }
</style>