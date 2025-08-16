<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  export const breakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  export let minWidth: number = 320;
  export let maxWidth: number = 1200;
  
  let screenWidth = 0;
  let screenHeight = 0;
  let isMobile = false;
  let isTablet = false;
  let isDesktop = false;
  
  function updateScreenSize() {
    if (!browser) return;
    
    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;
    
    isMobile = screenWidth < 768;
    isTablet = screenWidth >= 768 && screenWidth < 1024;
    isDesktop = screenWidth >= 1024;
  }
  
  onMount(() => {
    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    
    return () => {
      window.removeEventListener('resize', updateScreenSize);
    };
  });
  
  $: containerClasses = [
    'w-full mx-auto transition-all duration-300',
    isMobile ? 'px-4' : isTablet ? 'px-6' : 'px-8',
    `max-w-[${maxWidth}px]`,
    `min-w-[${minWidth}px]`
  ].join(' ');
</script>

<div class={containerClasses}>
  <slot {isMobile} {isTablet} {isDesktop} {screenWidth} {screenHeight} />
</div>

<!-- Responsive grid utilities -->
<style>
  :global(.grid-responsive) {
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr;
  }
  
  @media (min-width: 640px) {
    :global(.grid-responsive) {
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }
  }
  
  @media (min-width: 1024px) {
    :global(.grid-responsive) {
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }
  }
  
  :global(.stack-mobile) {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  @media (min-width: 768px) {
    :global(.stack-mobile) {
      flex-direction: row;
      align-items: center;
    }
  }
</style>