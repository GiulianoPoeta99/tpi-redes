<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { open } from '@tauri-apps/plugin-dialog';
  import { readFile } from '@tauri-apps/plugin-fs';
  import { TransferUtils } from '../types';
  import FilePreview from './FilePreview.svelte';

  export let disabled: boolean = false;
  export let multiple: boolean = false;
  export let maxFileSize: number = 1024 * 1024 * 1024; // 1GB default
  export let allowedTypes: string[] = []; // Empty array means all types allowed
  export let selectedFiles: File[] = [];

  const dispatch = createEventDispatcher<{
    filesSelected: File[];
    fileValidationError: { file: File; error: string };
  }>();

  let dragOver = false;
  let dragCounter = 0;

  // File validation
  function validateFile(file: File): string | null {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size (${TransferUtils.formatBytes(file.size)}) exceeds maximum allowed size (${TransferUtils.formatBytes(maxFileSize)})`;
    }

    // Check file type if restrictions are set
    if (allowedTypes.length > 0) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type.toLowerCase();
      
      const isAllowed = allowedTypes.some(type => {
        if (type.startsWith('.')) {
          // Extension check
          return fileExtension === type.slice(1).toLowerCase();
        } else if (type.includes('/')) {
          // MIME type check
          return mimeType === type.toLowerCase() || mimeType.startsWith(type.split('/')[0] + '/');
        }
        return false;
      });

      if (!isAllowed) {
        return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
      }
    }

    return null;
  }

  function processFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        dispatch('fileValidationError', { file, error });
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      if (multiple) {
        selectedFiles = [...selectedFiles, ...validFiles];
      } else {
        selectedFiles = [validFiles[0]]; // Only take the first file if not multiple
      }
      dispatch('filesSelected', selectedFiles);
    }
  }

  // Drag and drop handlers
  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
      dragOver = true;
    }
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      dragOver = false;
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    dragCounter = 0;

    if (disabled) return;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }

  // File browser integration
  async function openFileBrowser() {
    if (disabled) return;

    try {
      const selected = await open({
        multiple,
        filters: allowedTypes.length > 0 ? [{
          name: 'Allowed Files',
          extensions: allowedTypes.filter(type => type.startsWith('.')).map(type => type.slice(1))
        }] : undefined
      });

      if (selected) {
        // Convert Tauri file paths to File objects
        const files: File[] = [];
        const paths = Array.isArray(selected) ? selected : [selected];
        
        for (const path of paths) {
          try {
            // Read file content using Tauri's filesystem API
            const fileData = await readBinaryFile(path);
            const fileName = path.split('/').pop() || path.split('\\').pop() || 'unknown';
            const file = new File([fileData], fileName);
            files.push(file);
          } catch (error) {
            console.error(`Failed to read file ${path}:`, error);
          }
        }

        if (files.length > 0) {
          processFiles(files);
        }
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error);
    }
  }

  function removeFile(index: number) {
    selectedFiles = selectedFiles.filter((_, i) => i !== index);
    dispatch('filesSelected', selectedFiles);
  }

  function clearFiles() {
    selectedFiles = [];
    dispatch('filesSelected', selectedFiles);
  }
</script>

<div class="file-drop-zone" data-testid="file-drop-zone">
  <!-- Drop Zone -->
  <div 
    class="dropzone"
    class:drag-over={dragOver}
    class:disabled
    data-testid="dropzone"
    on:dragenter={handleDragEnter}
    on:dragleave={handleDragLeave}
    on:dragover={handleDragOver}
    on:drop={handleDrop}
    on:click={openFileBrowser}
    on:keydown={(e) => e.key === 'Enter' && openFileBrowser()}
    role="button"
    tabindex="0"
  >
    <div class="dropzone-content">
      {#if dragOver}
        <div class="drag-feedback">
          <span class="icon">📁</span>
          <p class="text">Drop files here</p>
        </div>
      {:else}
        <div class="default-content">
          <span class="icon">📁</span>
          <p class="text">
            {#if selectedFiles.length === 0}
              Drag & drop files here or click to browse
            {:else if multiple}
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
            {:else}
              {selectedFiles[0].name}
            {/if}
          </p>
          <p class="subtext">
            {#if maxFileSize < Infinity}
              Max size: {TransferUtils.formatBytes(maxFileSize)}
            {/if}
            {#if allowedTypes.length > 0}
              • Allowed: {allowedTypes.join(', ')}
            {/if}
          </p>
        </div>
      {/if}
    </div>
  </div>

  <!-- File Preview -->
  {#if selectedFiles.length > 0}
    <div class="file-preview" data-testid="file-preview">
      <div class="preview-header">
        <h3 class="preview-title">Selected Files</h3>
        {#if multiple}
          <button 
            class="btn btn-sm btn-secondary"
            data-testid="clear-files"
            on:click={clearFiles}
            {disabled}
          >
            Clear All
          </button>
        {/if}
      </div>
      
      <div class="file-list">
        {#each selectedFiles as file, index}
          <FilePreview 
            {file} 
            {index} 
            {disabled}
            on:remove={(event) => removeFile(event.detail)}
          />
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .file-drop-zone {
    @apply space-y-4;
  }

  .dropzone {
    @apply border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8;
    @apply bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700;
    @apply cursor-pointer transition-colors duration-200;
    @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
  }

  .dropzone.drag-over {
    @apply border-blue-500 bg-blue-50 dark:bg-blue-900/20;
  }

  .dropzone.disabled {
    @apply opacity-50 cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800;
  }

  .dropzone-content {
    @apply text-center;
  }

  .drag-feedback .icon,
  .default-content .icon {
    @apply text-4xl mb-2 block;
  }

  .drag-feedback .text,
  .default-content .text {
    @apply text-lg font-medium text-gray-700 dark:text-gray-300 mb-1;
  }

  .default-content .subtext {
    @apply text-sm text-gray-500 dark:text-gray-400;
  }

  .file-preview {
    @apply bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4;
  }

  .preview-header {
    @apply flex justify-between items-center mb-4;
  }

  .preview-title {
    @apply text-lg font-medium text-gray-900 dark:text-gray-100;
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>