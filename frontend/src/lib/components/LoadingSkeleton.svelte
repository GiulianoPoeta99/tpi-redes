<script lang="ts">
  export let type: 'card' | 'text' | 'button' | 'progress' | 'list' = 'card';
  export let lines: number = 3;
  export let width: string = 'w-full';
  export let height: string = 'h-4';
</script>

{#if type === 'card'}
  <div class="card p-6 animate-pulse">
    <div class="skeleton h-6 w-3/4 mb-4"></div>
    {#each Array(lines) as _, i}
      <div class="skeleton {height} {i === lines - 1 ? 'w-1/2' : 'w-full'} mb-2"></div>
    {/each}
  </div>
{:else if type === 'text'}
  {#each Array(lines) as _, i}
    <div class="skeleton {height} {i === lines - 1 ? 'w-1/2' : width} mb-2"></div>
  {/each}
{:else if type === 'button'}
  <div class="skeleton h-10 w-24 rounded-lg"></div>
{:else if type === 'progress'}
  <div class="space-y-2">
    <div class="skeleton h-4 w-1/3"></div>
    <div class="progress-bar">
      <div class="skeleton h-full w-2/3 rounded-full"></div>
    </div>
    <div class="skeleton h-3 w-1/4"></div>
  </div>
{:else if type === 'list'}
  {#each Array(lines) as _, i}
    <div class="flex items-center space-x-3 mb-3">
      <div class="skeleton-circle w-8 h-8"></div>
      <div class="flex-1">
        <div class="skeleton h-4 w-3/4 mb-1"></div>
        <div class="skeleton h-3 w-1/2"></div>
      </div>
    </div>
  {/each}
{/if}