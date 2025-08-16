<script lang="ts">
  export let text: string;
  export let position: 'top' | 'bottom' | 'left' | 'right' = 'top';
  export let delay: number = 500;
  export let disabled: boolean = false;
  
  let showTooltip = false;
  let timeoutId: number;
  
  function handleMouseEnter() {
    if (disabled) return;
    timeoutId = setTimeout(() => {
      showTooltip = true;
    }, delay);
  }
  
  function handleMouseLeave() {
    clearTimeout(timeoutId);
    showTooltip = false;
  }
  
  function handleFocus() {
    if (disabled) return;
    showTooltip = true;
  }
  
  function handleBlur() {
    showTooltip = false;
  }
  
  $: positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };
  
  $: arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900 dark:border-t-gray-700',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900 dark:border-b-gray-700',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900 dark:border-l-gray-700',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900 dark:border-r-gray-700'
  };
</script>

<div 
  class="relative inline-block"
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  on:focus={handleFocus}
  on:blur={handleBlur}
  role="button"
  tabindex="0"
>
  <slot />
  
  {#if showTooltip && text}
    <div 
      class="absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg whitespace-nowrap pointer-events-none transition-opacity duration-200 {positionClasses[position]}"
      role="tooltip"
    >
      {text}
      <!-- Tooltip arrow -->
      <div class="absolute w-0 h-0 border-4 border-transparent {arrowClasses[position]}"></div>
    </div>
  {/if}
</div>