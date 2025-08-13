# Settings System

The application settings system provides comprehensive configuration management with persistence, validation, and a user-friendly interface.

## Components

### Settings.svelte
Main settings component that provides a complete settings interface including:
- Theme selection (light/dark/system)
- Default connection settings (protocol, port, timeout, chunk size)
- Developer mode toggle
- UI preferences (advanced options, auto-save, confirm exit, show history)
- File handling preferences (max file size, show hidden files)
- Notification settings integration
- Settings import/export functionality
- Reset to defaults with confirmation

### Usage
```svelte
<script>
  import Settings from '$lib/components/Settings.svelte';
</script>

<Settings showAdvanced={false} />
```

## Stores

### appSettings
Main application settings store with the following features:

#### Settings Structure
```typescript
interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultConnection: {
    protocol: 'Tcp' | 'Udp';
    port: number;
    timeout: number;
    chunkSize: number;
  };
  notifications: NotificationSettings;
  developerMode: boolean;
  ui: {
    showAdvancedOptions: boolean;
    autoSaveConfig: boolean;
    confirmBeforeExit: boolean;
    showTransferHistory: boolean;
  };
  files: {
    defaultDownloadPath?: string;
    maxFileSize: number;
    allowedFileTypes: string[];
    showHiddenFiles: boolean;
  };
}
```

#### Store Methods
```typescript
// Update individual settings
appSettings.updateSetting('theme', 'dark');

// Update nested settings
appSettings.updateNestedSetting('defaultConnection', 'port', 9090);

// Export settings as JSON
const exported = appSettings.export();

// Import settings from JSON
const result = appSettings.import(jsonString);

// Reset to defaults
appSettings.reset();

// Get default transfer config
const transferConfig = appSettings.getDefaultTransferConfig();

// Apply theme to document
appSettings.applyTheme();
```

## Features

### Persistence
- Automatic localStorage persistence
- Graceful error handling for storage failures
- Settings validation before saving

### Theme Management
- Light, dark, and system theme options
- Automatic theme application to document
- System theme change detection

### Validation
- Comprehensive settings validation
- Port range validation (1-65535)
- File size limits (1B - 10GB)
- Timeout limits (1s - 1h)
- Chunk size limits (1B - 1MB)

### Import/Export
- JSON format for settings portability
- Validation during import
- Error reporting for invalid settings
- Partial settings import support

### Integration
- Seamless integration with notification settings
- Default transfer configuration generation
- Developer mode for advanced features

## Testing

The settings system includes comprehensive tests:
- Unit tests for validation logic
- Integration tests for store functionality
- Component tests for UI interactions
- Error handling tests for edge cases

Run tests with:
```bash
npm test -- --run src/lib/stores/settings.test.ts
npm test -- --run src/lib/stores/settings.integration.test.ts
```

## Requirements Fulfilled

This implementation satisfies all requirements from task 17:

- ✅ **9.1**: Persistent configuration settings with localStorage
- ✅ **9.2**: Settings load and apply on application start
- ✅ **9.3**: Automatic saving of configuration changes
- ✅ **9.4**: Reset configuration with user confirmation
- ✅ **9.5**: Graceful handling of corrupted configuration files
- ✅ **9.6**: Portable configuration file export/import

The settings system provides a robust foundation for user preferences and application configuration management.