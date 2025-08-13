<script lang="ts">
  import Settings from '$lib/components/Settings.svelte';
  import { onMount } from 'svelte';
  
  let showAdvanced = false;

  onMount(() => {
    // Set page title
    document.title = 'Settings - File Transfer App';
  });
</script>

<svelte:head>
  <title>Settings - File Transfer App</title>
  <meta name="description" content="Configure your file transfer application preferences and settings" />
</svelte:head>

<main class="settings-page">
  <div class="container">
    <Settings bind:showAdvanced />
  </div>
</main>

<style>
  .settings-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    padding: 2rem 0;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .settings-page {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    }
  }

  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .settings-page {
      padding: 1rem 0;
    }

    .container {
      padding: 0 0.5rem;
    }
  }
</style>