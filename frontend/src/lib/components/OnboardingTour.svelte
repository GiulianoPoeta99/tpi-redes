<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  const dispatch = createEventDispatcher<{
    complete: void;
    skip: void;
  }>();
  
  export let show: boolean = false;
  
  interface TourStep {
    id: string;
    title: string;
    content: string;
    target?: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  }
  
  const steps: TourStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to File Transfer App',
      content: 'This app helps you transfer files securely between computers using TCP or UDP protocols. Let\'s take a quick tour!',
      position: 'center'
    },
    {
      id: 'mode-selection',
      title: 'Choose Your Mode',
      content: 'First, select whether you want to send files (Transmitter) or receive files (Receiver).',
      target: '[data-testid="mode-selector"]',
      position: 'bottom'
    },
    {
      id: 'protocol-config',
      title: 'Configure Connection',
      content: 'Set up your network connection by choosing a protocol (TCP for reliability, UDP for speed) and configuring the target address.',
      target: '[data-testid="connection-config"]',
      position: 'top'
    },
    {
      id: 'file-selection',
      title: 'Select Files',
      content: 'Drag and drop files or click to browse. The app will show you file information and transfer progress.',
      position: 'center'
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      content: 'Press F1 anytime to see available keyboard shortcuts. Use Ctrl+O to open files, Ctrl+S to start transfers, and more!',
      position: 'center'
    }
  ];
  
  let currentStep = 0;
  let targetElement: HTMLElement | null = null;
  let overlayPosition = { top: 0, left: 0, width: 0, height: 0 };
  
  $: currentStepData = steps[currentStep];
  $: isLastStep = currentStep === steps.length - 1;
  
  function nextStep() {
    if (isLastStep) {
      completeTour();
    } else {
      currentStep++;
      updateTargetHighlight();
    }
  }
  
  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
      updateTargetHighlight();
    }
  }
  
  function skipTour() {
    dispatch('skip');
    show = false;
  }
  
  function completeTour() {
    dispatch('complete');
    show = false;
    if (browser) {
      localStorage.setItem('onboarding-completed', 'true');
    }
  }
  
  function updateTargetHighlight() {
    if (!browser || !currentStepData.target) {
      targetElement = null;
      return;
    }
    
    targetElement = document.querySelector(currentStepData.target);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      overlayPosition = {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      };
      
      // Scroll target into view
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  onMount(() => {
    if (show) {
      updateTargetHighlight();
    }
  });
  
  $: if (show && browser) {
    updateTargetHighlight();
  }
</script>

{#if show}
  <!-- Overlay backdrop -->
  <div class="fixed inset-0 bg-black bg-opacity-75 z-40 transition-opacity duration-300">
    <!-- Highlight cutout for target element -->
    {#if targetElement && currentStepData.target}
      <div 
        class="absolute border-4 border-primary-400 rounded-lg shadow-lg transition-all duration-300"
        style="top: {overlayPosition.top - 4}px; left: {overlayPosition.left - 4}px; width: {overlayPosition.width + 8}px; height: {overlayPosition.height + 8}px;"
      ></div>
    {/if}
  </div>
  
  <!-- Tour modal -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
    <div 
      class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6 pointer-events-auto transform transition-all duration-300 scale-100"
      class:animate-fade-in={show}
    >
      <!-- Progress indicator -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex space-x-2">
          {#each steps as _, index}
            <div 
              class="w-2 h-2 rounded-full transition-colors duration-200"
              class:bg-primary-600={index <= currentStep}
              class:bg-gray-300={index > currentStep}
            ></div>
          {/each}
        </div>
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {currentStep + 1} of {steps.length}
        </span>
      </div>
      
      <!-- Step content -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {currentStepData.title}
        </h3>
        <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
          {currentStepData.content}
        </p>
      </div>
      
      <!-- Navigation buttons -->
      <div class="flex items-center justify-between">
        <button 
          class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          on:click={skipTour}
        >
          Skip Tour
        </button>
        
        <div class="flex space-x-3">
          {#if currentStep > 0}
            <button 
              class="btn btn-secondary"
              on:click={prevStep}
            >
              Previous
            </button>
          {/if}
          
          <button 
            class="btn btn-primary"
            on:click={nextStep}
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
</style>