<script lang="ts">
  import '../app.css';
  import NotificationContainer from '$lib/components/NotificationContainer.svelte';
</script>

<main class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <slot />
</main>

<!-- Global notification container -->
<NotificationContainer />