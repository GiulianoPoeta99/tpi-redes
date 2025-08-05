# File Selection Components

This directory contains the file selection interface components for the file transfer application.

## Components

### FileDropZone.svelte

A comprehensive file selection component with drag-and-drop functionality and native file browser integration.

**Features:**
- Drag and drop file selection with visual feedback
- Native file browser integration using Tauri dialogs
- File validation (size limits, type restrictions)
- Multiple file selection support
- File preview with detailed information
- Accessibility support (keyboard navigation, ARIA attributes)
- Disabled state support

**Props:**
- `disabled: boolean` - Disables the component
- `multiple: boolean` - Allows multiple file selection
- `maxFileSize: number` - Maximum file size in bytes (default: 1GB)
- `allowedTypes: string[]` - Array of allowed file types (extensions or MIME types)
- `selectedFiles: File[]` - Currently selected files (bindable)

**Events:**
- `filesSelected: File[]` - Emitted when files are selected
- `fileValidationError: { file: File; error: string }` - Emitted when file validation fails

**Usage:**
```svelte
<script>
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  
  let selectedFiles = [];
  
  function handleFilesSelected(event) {
    selectedFiles = event.detail;
    console.log('Selected files:', selectedFiles);
  }
  
  function handleValidationError(event) {
    console.error('Validation error:', event.detail);
  }
</script>

<FileDropZone
  multiple={true}
  maxFileSize={10 * 1024 * 1024}
  allowedTypes={['.txt', '.pdf', '.jpg']}
  on:filesSelected={handleFilesSelected}
  on:fileValidationError={handleValidationError}
/>
```

### FilePreview.svelte

A component for displaying detailed file information with an optional remove button.

**Features:**
- File type detection with appropriate icons
- File size formatting (B, KB, MB, GB)
- Last modified date formatting (relative and absolute)
- MIME type display
- Remove functionality
- Disabled state support

**Props:**
- `file: File` - The file to preview
- `showRemoveButton: boolean` - Whether to show the remove button (default: true)
- `disabled: boolean` - Disables the remove button
- `index: number` - Index of the file (used for event emission)

**Events:**
- `remove: number` - Emitted when the remove button is clicked (passes the index)

**Usage:**
```svelte
<script>
  import FilePreview from '$lib/components/FilePreview.svelte';
  
  let files = [/* array of File objects */];
  
  function handleRemove(event) {
    const index = event.detail;
    files = files.filter((_, i) => i !== index);
  }
</script>

{#each files as file, index}
  <FilePreview 
    {file} 
    {index} 
    on:remove={handleRemove}
  />
{/each}
```

## File Validation

The components include comprehensive file validation:

### Size Validation
- Configurable maximum file size
- User-friendly error messages with formatted sizes

### Type Validation
- Extension-based validation (e.g., `.txt`, `.pdf`)
- MIME type validation (e.g., `image/`, `text/plain`)
- Flexible configuration supporting both approaches

### Example Validation Configurations

```javascript
// Allow only text files
allowedTypes: ['.txt', '.md', 'text/']

// Allow only images
allowedTypes: ['.jpg', '.png', '.gif', 'image/']

// Allow documents
allowedTypes: ['.pdf', '.doc', '.docx', 'application/pdf']

// No restrictions (empty array)
allowedTypes: []
```

## File Type Detection

The FilePreview component automatically detects file types and displays appropriate icons:

- 🖼️ Images (jpg, png, gif, etc.)
- 📄 Documents (pdf, doc, txt, etc.)
- 🎥 Videos (mp4, avi, mov, etc.)
- 🎵 Audio (mp3, wav, flac, etc.)
- 💻 Code files (js, ts, py, java, etc.)
- 🗜️ Archives (zip, rar, 7z, etc.)
- 📁 Unknown/other files

## Accessibility

Both components are built with accessibility in mind:

- Keyboard navigation support
- ARIA attributes for screen readers
- Focus management
- High contrast support
- Semantic HTML structure

## Testing

The components include comprehensive tests covering:

- File selection workflows
- Validation logic
- Error handling
- Accessibility features
- Edge cases

Run tests with:
```bash
npm test -- --run file-validation
```

## Dependencies

- `@tauri-apps/plugin-dialog` - For native file browser integration
- `@tauri-apps/plugin-fs` - For file system access
- Tailwind CSS - For styling
- Svelte 5 - Component framework

## Browser Compatibility

The components use modern web APIs:
- File API
- Drag and Drop API
- FileReader API

These are supported in all modern browsers. For older browser support, polyfills may be required.