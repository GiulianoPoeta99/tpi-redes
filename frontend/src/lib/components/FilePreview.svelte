<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { TransferUtils } from '../types';

  export let file: File;
  export let showRemoveButton: boolean = true;
  export let disabled: boolean = false;
  export let index: number = 0;

  const dispatch = createEventDispatcher<{
    remove: number;
  }>();

  // File type detection
  function getFileIcon(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    // Image files
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    }
    
    // Document files
    if (mimeType.includes('pdf') || extension === 'pdf') {
      return '📄';
    }
    
    if (mimeType.includes('word') || ['doc', 'docx'].includes(extension || '')) {
      return '📝';
    }
    
    if (mimeType.includes('excel') || ['xls', 'xlsx'].includes(extension || '')) {
      return '📊';
    }
    
    if (mimeType.includes('powerpoint') || ['ppt', 'pptx'].includes(extension || '')) {
      return '📈';
    }
    
    // Code files (check before text files)
    if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'].includes(extension || '')) {
      return '💻';
    }
    
    // Text files
    if (mimeType.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'csv'].includes(extension || '')) {
      return '📄';
    }
    
    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
      return '🗜️';
    }
    
    // Video files
    if (mimeType.startsWith('video/')) {
      return '🎥';
    }
    
    // Audio files
    if (mimeType.startsWith('audio/')) {
      return '🎵';
    }
    
    // Default
    return '📁';
  }

  function getFileTypeLabel(file: File): string {
    const extension = file.name.split('.').pop()?.toUpperCase();
    if (extension) {
      return `${extension} File`;
    }
    
    if (file.type) {
      return file.type;
    }
    
    return 'Unknown';
  }

  function handleRemove() {
    if (!disabled) {
      dispatch('remove', index);
    }
  }

  function formatLastModified(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
</script>

<div class="file-preview" data-testid="file-preview-{index}">
  <div class="file-icon">
    {getFileIcon(file)}
  </div>
  
  <div class="file-info">
    <div class="file-name" title={file.name}>
      {file.name}
    </div>
    
    <div class="file-metadata">
      <span class="file-size" data-testid="file-size">
        {TransferUtils.formatBytes(file.size)}
      </span>
      
      <span class="file-type" data-testid="file-type">
        {getFileTypeLabel(file)}
      </span>
      
      <span class="file-modified" data-testid="file-modified">
        {formatLastModified(file.lastModified)}
      </span>
    </div>
    
    {#if file.type}
      <div class="mime-type" data-testid="mime-type">
        {file.type}
      </div>
    {/if}
  </div>
  
  {#if showRemoveButton}
    <button 
      class="remove-button"
      class:disabled
      data-testid="remove-button-{index}"
      on:click={handleRemove}
      title="Remove file"
      {disabled}
    >
      <span class="remove-icon">✕</span>
    </button>
  {/if}
</div>

<style>
  .file-preview {
    @apply flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg;
    @apply hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150;
  }

  .file-icon {
    @apply text-2xl mr-3 flex-shrink-0;
  }

  .file-info {
    @apply flex-1 min-w-0;
  }

  .file-name {
    @apply font-medium text-gray-900 dark:text-gray-100 truncate text-sm;
  }

  .file-metadata {
    @apply flex items-center space-x-3 mt-1 text-xs text-gray-500 dark:text-gray-400;
  }

  .file-size {
    @apply font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded;
  }

  .file-type {
    @apply bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded;
  }

  .file-modified {
    @apply text-gray-600 dark:text-gray-400;
  }

  .mime-type {
    @apply text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono;
  }

  .remove-button {
    @apply ml-3 flex-shrink-0 w-8 h-8 flex items-center justify-center;
    @apply bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800;
    @apply text-red-600 dark:text-red-400 rounded-full transition-colors duration-150;
    @apply focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2;
  }

  .remove-button.disabled {
    @apply opacity-50 cursor-not-allowed hover:bg-red-100 dark:hover:bg-red-900;
  }

  .remove-icon {
    @apply text-sm font-bold;
  }
</style>