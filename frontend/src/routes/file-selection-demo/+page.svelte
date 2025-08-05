<script lang="ts">
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import type { TransferConfig } from '$lib/types';

  let selectedFiles: File[] = [];
  let validationErrors: Array<{ file: File; error: string }> = [];

  function handleFilesSelected(event: CustomEvent<File[]>) {
    selectedFiles = event.detail;
    console.log('Files selected:', selectedFiles);
  }

  function handleValidationError(event: CustomEvent<{ file: File; error: string }>) {
    validationErrors = [...validationErrors, event.detail];
    console.log('Validation error:', event.detail);
    
    // Clear error after 5 seconds
    setTimeout(() => {
      validationErrors = validationErrors.filter(e => e !== event.detail);
    }, 5000);
  }
</script>

<div class="container mx-auto p-8 max-w-4xl">
  <h1 class="text-3xl font-bold mb-8">File Selection Demo</h1>
  
  <div class="space-y-8">
    <!-- Single File Selection -->
    <section>
      <h2 class="text-2xl font-semibold mb-4">Single File Selection</h2>
      <FileDropZone
        multiple={false}
        maxFileSize={10 * 1024 * 1024}
        allowedTypes={['.txt', '.pdf', '.jpg', '.png']}
        on:filesSelected={handleFilesSelected}
        on:fileValidationError={handleValidationError}
      />
    </section>

    <!-- Multiple File Selection -->
    <section>
      <h2 class="text-2xl font-semibold mb-4">Multiple File Selection</h2>
      <FileDropZone
        multiple={true}
        maxFileSize={50 * 1024 * 1024}
        on:filesSelected={handleFilesSelected}
        on:fileValidationError={handleValidationError}
      />
    </section>

    <!-- Restricted File Types -->
    <section>
      <h2 class="text-2xl font-semibold mb-4">Restricted File Types (Images Only)</h2>
      <FileDropZone
        multiple={true}
        maxFileSize={5 * 1024 * 1024}
        allowedTypes={['.jpg', '.jpeg', '.png', '.gif', '.webp']}
        on:filesSelected={handleFilesSelected}
        on:fileValidationError={handleValidationError}
      />
    </section>

    <!-- Disabled State -->
    <section>
      <h2 class="text-2xl font-semibold mb-4">Disabled State</h2>
      <FileDropZone
        disabled={true}
        multiple={true}
        on:filesSelected={handleFilesSelected}
        on:fileValidationError={handleValidationError}
      />
    </section>
  </div>

  <!-- Validation Errors -->
  {#if validationErrors.length > 0}
    <div class="mt-8">
      <h3 class="text-xl font-semibold mb-4 text-red-600">Validation Errors</h3>
      <div class="space-y-2">
        {#each validationErrors as error}
          <div class="bg-red-50 border border-red-200 rounded-md p-3">
            <p class="text-red-800">
              <strong>{error.file.name}:</strong> {error.error}
            </p>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Selected Files Summary -->
  {#if selectedFiles.length > 0}
    <div class="mt-8">
      <h3 class="text-xl font-semibold mb-4">Selected Files Summary</h3>
      <div class="bg-gray-50 rounded-md p-4">
        <p class="text-gray-700 mb-2">
          Total files: {selectedFiles.length}
        </p>
        <p class="text-gray-700">
          Total size: {selectedFiles.reduce((sum, file) => sum + file.size, 0).toLocaleString()} bytes
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    @apply bg-gray-100 dark:bg-gray-900;
  }
</style>