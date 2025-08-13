<script lang="ts">
  import { onMount } from 'svelte';
  import { appSettings, type AppSettings, type Theme, AppSettingsValidator } from '../stores/settings';
  import { notificationSettings } from '../services/system-notifications';
  import NotificationSettings from './NotificationSettings.svelte';

  // Component props
  export let showAdvanced = false;

  // Local state
  let settings: AppSettings;
  let importError: string | null = null;
  let exportSuccess = false;
  let resetConfirmation = false;
  let validationErrors: string[] = [];

  // File input reference for import
  let fileInput: HTMLInputElement;

  // Subscribe to settings store
  const unsubscribe = appSettings.subscribe(value => {
    settings = value;
    // Sync notification settings
    syncNotificationSettings();
    // Validate current settings
    validationErrors = AppSettingsValidator.validate(settings);
  });

  onMount(() => {
    return unsubscribe;
  });

  // Sync notification settings with app settings
  function syncNotificationSettings() {
    if (settings) {
      notificationSettings.import(settings.notifications);
    }
  }

  // Theme selection handlers
  function updateTheme(theme: Theme) {
    appSettings.updateSetting('theme', theme);
  }

  // Default connection settings handlers
  function updateDefaultProtocol(protocol: 'Tcp' | 'Udp') {
    appSettings.updateNestedSetting('defaultConnection', 'protocol', protocol);
  }

  function updateDefaultPort(port: number) {
    if (port > 0 && port <= 65535) {
      appSettings.updateNestedSetting('defaultConnection', 'port', port);
    }
  }

  function updateDefaultTimeout(timeout: number) {
    if (timeout > 0 && timeout <= 3600) {
      appSettings.updateNestedSetting('defaultConnection', 'timeout', timeout);
    }
  }

  function updateDefaultChunkSize(chunkSize: number) {
    if (chunkSize > 0 && chunkSize <= 1024 * 1024) {
      appSettings.updateNestedSetting('defaultConnection', 'chunkSize', chunkSize);
    }
  }

  // Developer mode toggle
  function toggleDeveloperMode() {
    appSettings.updateSetting('developerMode', !settings.developerMode);
  }

  // UI preferences handlers
  function updateUIPreference<K extends keyof AppSettings['ui']>(
    key: K, 
    value: AppSettings['ui'][K]
  ) {
    appSettings.updateNestedSetting('ui', key, value);
  }

  // File preferences handlers
  function updateFilePreference<K extends keyof AppSettings['files']>(
    key: K, 
    value: AppSettings['files'][K]
  ) {
    appSettings.updateNestedSetting('files', key, value);
  }

  function updateMaxFileSize(sizeInMB: number) {
    const sizeInBytes = sizeInMB * 1024 * 1024;
    if (sizeInBytes > 0 && sizeInBytes <= 10 * 1024 * 1024 * 1024) {
      appSettings.updateNestedSetting('files', 'maxFileSize', sizeInBytes);
    }
  }

  // Settings management
  function exportSettings() {
    try {
      const settingsData = appSettings.export();
      const blob = new Blob([settingsData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `file-transfer-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      exportSuccess = true;
      setTimeout(() => {
        exportSuccess = false;
      }, 3000);
    } catch (error) {
      console.error('Failed to export settings:', error);
      importError = 'Failed to export settings';
      setTimeout(() => {
        importError = null;
      }, 5000);
    }
  }

  function triggerImport() {
    fileInput.click();
  }

  async function importSettings(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = appSettings.import(text);
      
      if (result.success) {
        importError = null;
        exportSuccess = true;
        setTimeout(() => {
          exportSuccess = false;
        }, 3000);
      } else {
        importError = `Import failed: ${result.errors.join(', ')}`;
        setTimeout(() => {
          importError = null;
        }, 5000);
      }
    } catch (error) {
      importError = 'Failed to read settings file';
      setTimeout(() => {
        importError = null;
      }, 5000);
    }

    // Clear file input
    if (fileInput) {
      fileInput.value = '';
    }
  }

  function confirmReset() {
    resetConfirmation = true;
  }

  function cancelReset() {
    resetConfirmation = false;
  }

  function executeReset() {
    appSettings.reset();
    resetConfirmation = false;
    exportSuccess = true;
    setTimeout(() => {
      exportSuccess = false;
    }, 3000);
  }

  // Reactive statements
  $: maxFileSizeInMB = settings ? Math.round(settings.files.maxFileSize / (1024 * 1024)) : 1024;
  $: hasValidationErrors = validationErrors.length > 0;
</script>

<div class="settings-container" data-testid="settings-container">
  <div class="settings-header">
    <h2>Application Settings</h2>
    <p class="settings-description">
      Configure your file transfer application preferences and default values.
    </p>
  </div>

  <!-- Validation Errors -->
  {#if hasValidationErrors}
    <div class="error-banner" data-testid="validation-errors">
      <h4>⚠️ Settings Validation Errors</h4>
      <ul>
        {#each validationErrors as error}
          <li>{error}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Import/Export Status -->
  {#if importError}
    <div class="error-banner" data-testid="import-error">
      {importError}
    </div>
  {/if}

  {#if exportSuccess}
    <div class="success-banner" data-testid="export-success">
      ✅ Settings exported/imported successfully!
    </div>
  {/if}

  <!-- Theme Settings -->
  <div class="setting-group">
    <h3 class="group-title">Appearance</h3>
    
    <div class="setting-item">
      <div class="setting-info">
        <label class="setting-label">Theme</label>
        <p class="setting-description">
          Choose your preferred color theme
        </p>
      </div>
      
      <div class="setting-controls">
        <div class="radio-group" data-testid="theme-selector">
          <label class="radio-option">
            <input
              type="radio"
              name="theme"
              value="light"
              checked={settings.theme === 'light'}
              on:change={() => updateTheme('light')}
            />
            <span>Light</span>
          </label>
          
          <label class="radio-option">
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={settings.theme === 'dark'}
              on:change={() => updateTheme('dark')}
            />
            <span>Dark</span>
          </label>
          
          <label class="radio-option">
            <input
              type="radio"
              name="theme"
              value="system"
              checked={settings.theme === 'system'}
              on:change={() => updateTheme('system')}
            />
            <span>System</span>
          </label>
        </div>
      </div>
    </div>
  </div>

  <!-- Default Connection Settings -->
  <div class="setting-group">
    <h3 class="group-title">Default Connection Settings</h3>
    
    <div class="setting-item">
      <div class="setting-info">
        <label class="setting-label">Default Protocol</label>
        <p class="setting-description">
          Protocol to use by default for new transfers
        </p>
      </div>
      
      <div class="setting-controls">
        <select 
          bind:value={settings.defaultConnection.protocol}
          on:change={(e) => updateDefaultProtocol(e.target.value as 'Tcp' | 'Udp')}
          data-testid="default-protocol"
        >
          <option value="Tcp">TCP</option>
          <option value="Udp">UDP</option>
        </select>
      </div>
    </div>

    <div class="setting-item">
      <div class="setting-info">
        <label class="setting-label" for="default-port">Default Port</label>
        <p class="setting-description">
          Port number to use by default (1-65535)
        </p>
      </div>
      
      <div class="setting-controls">
        <input
          id="default-port"
          type="number"
          min="1"
          max="65535"
          bind:value={settings.defaultConnection.port}
          on:input={(e) => updateDefaultPort(parseInt(e.target.value))}
          data-testid="default-port"
        />
      </div>
    </div>

    <div class="setting-item">
      <div class="setting-info">
        <label class="setting-label" for="default-timeout">Default Timeout (seconds)</label>
        <p class="setting-description">
          Connection timeout in seconds (1-3600)
        </p>
      </div>
      
      <div class="setting-controls">
        <input
          id="default-timeout"
          type="number"
          min="1"
          max="3600"
          bind:value={settings.defaultConnection.timeout}
          on:input={(e) => updateDefaultTimeout(parseInt(e.target.value))}
          data-testid="default-timeout"
        />
      </div>
    </div>

    <div class="setting-item">
      <div class="setting-info">
        <label class="setting-label" for="default-chunk-size">Default Chunk Size (bytes)</label>
        <p class="setting-description">
          Data chunk size for transfers (1-1048576)
        </p>
      </div>
      
      <div class="setting-controls">
        <input
          id="default-chunk-size"
          type="number"
          min="1"
          max="1048576"
          bind:value={settings.defaultConnection.chunkSize}
          on:input={(e) => updateDefaultChunkSize(parseInt(e.target.value))}
          data-testid="default-chunk-size"
        />
      </div>
    </div>
  </div>

  <!-- Developer Mode -->
  <div class="setting-group">
    <h3 class="group-title">Developer Options</h3>
    
    <div class="setting-item">
      <div class="setting-info">
        <label class="setting-label" for="developer-mode">Developer Mode</label>
        <p class="setting-description">
          Enable advanced debugging features and detailed logs
        </p>
      </div>
      
      <div class="setting-controls">
        <label class="toggle">
          <input
            id="developer-mode"
            type="checkbox"
            bind:checked={settings.developerMode}
            on:change={toggleDeveloperMode}
            data-testid="developer-mode"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>

  <!-- UI Preferences -->
  <div class="setting-group">
    <h3 class="group-title">User Interface</h3>
    
    <div class="setting-item">
      <div class="setting-info">
        <label class="setting-label" for="show-advanced">Show Advanced Options</label>
        <p class="setting-description">
          Display advanced configuration options by default
        </p>
      </div>
      
      <div class="setting-controls">
        <label class="toggle">
          <input
            id="show-advanced"
            type="checkbox"
            bind:checked={settings.ui.showAdvancedOptions}
            on:change={() => updateUIPreference('showAdvancedOptions', settings.ui.showAdvancedOptions)}
            data-testid="show-advanced-options"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="setting-item">
      <div class="setting-info">
        <label class="setting-label" for="auto-save">Auto-save Configuration</label>
        <p class="setting-description">
          Automatically save configuration changes
        </p>
      </div>
      
      <div class="setting-controls">
        <label class="toggle">
          <input
            id="auto-save"
            type="checkbox"
            bind:checked={settings.ui.autoSaveConfig}
            on:change={() => updateUIPreference('autoSaveConfig', settings.ui.autoSaveConfig)}
            data-testid="auto-save-config"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="setting-item">
      <div class="setting-info">
        <label class="setting-label" for="confirm-exit">Confirm Before Exit</label>
        <p class="setting-description">
          Show confirmation dialog when closing the application
        </p>
      </div>
      
      <div class="setting-controls">
        <label class="toggle">
          <input
            id="confirm-exit"
            type="checkbox"
            bind:checked={settings.ui.confirmBeforeExit}
            on:change={() => updateUIPreference('confirmBeforeExit', settings.ui.confirmBeforeExit)}
            data-testid="confirm-before-exit"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="setting-item">
      <div class="setting-info">
        <label class="setting-label" for="show-history">Show Transfer History</label>
        <p class="setting-description">
          Display transfer history in the main interface
        </p>
      </div>
      
      <div class="setting-controls">
        <label class="toggle">
          <input
            id="show-history"
            type="checkbox"
            bind:checked={settings.ui.showTransferHistory}
            on:change={() => updateUIPreference('showTransferHistory', settings.ui.showTransferHistory)}
            data-testid="show-transfer-history"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>

  <!-- File Handling -->
  <div class="setting-group">
    <h3 class="group-title">File Handling</h3>
    
    <div class="setting-item">
      <div class="setting-info">
        <label class="setting-label" for="max-file-size">Maximum File Size (MB)</label>
        <p class="setting-description">
          Maximum allowed file size for transfers (1-10240 MB)
        </p>
      </div>
      
      <div class="setting-controls">
        <input
          id="max-file-size"
          type="number"
          min="1"
          max="10240"
          bind:value={maxFileSizeInMB}
          on:input={(e) => updateMaxFileSize(parseInt(e.target.value))}
          data-testid="max-file-size"
        />
      </div>
    </div>

    <div class="setting-item">
      <div class="setting-info">
        <label class="setting-label" for="show-hidden">Show Hidden Files</label>
        <p class="setting-description">
          Include hidden files in file browser dialogs
        </p>
      </div>
      
      <div class="setting-controls">
        <label class="toggle">
          <input
            id="show-hidden"
            type="checkbox"
            bind:checked={settings.files.showHiddenFiles}
            on:change={() => updateFilePreference('showHiddenFiles', settings.files.showHiddenFiles)}
            data-testid="show-hidden-files"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>

  <!-- Notification Settings -->
  <div class="setting-group">
    <h3 class="group-title">Notifications</h3>
    <NotificationSettings {showAdvanced} />
  </div>

  <!-- Settings Management -->
  <div class="setting-group">
    <h3 class="group-title">Settings Management</h3>
    
    <div class="settings-actions">
      <button 
        class="btn btn-secondary"
        on:click={() => showAdvanced = !showAdvanced}
        data-testid="toggle-advanced-settings"
      >
        {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
      </button>
      
      <button 
        class="btn btn-primary"
        on:click={exportSettings}
        data-testid="export-settings"
      >
        Export Settings
      </button>
      
      <button 
        class="btn btn-primary"
        on:click={triggerImport}
        data-testid="import-settings"
      >
        Import Settings
      </button>
      
      {#if !resetConfirmation}
        <button 
          class="btn btn-danger"
          on:click={confirmReset}
          data-testid="reset-settings"
        >
          Reset to Defaults
        </button>
      {:else}
        <div class="reset-confirmation">
          <span>Are you sure?</span>
          <button 
            class="btn btn-danger btn-small"
            on:click={executeReset}
            data-testid="confirm-reset"
          >
            Yes, Reset
          </button>
          <button 
            class="btn btn-secondary btn-small"
            on:click={cancelReset}
            data-testid="cancel-reset"
          >
            Cancel
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Hidden file input for import -->
<input
  bind:this={fileInput}
  type="file"
  accept=".json"
  on:change={importSettings}
  style="display: none;"
  data-testid="file-input"
/>

<style>
  .settings-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .settings-header {
    margin-bottom: 2rem;
    text-align: center;
  }

  .settings-header h2 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
    font-size: 2rem;
    font-weight: 700;
  }

  .settings-description {
    margin: 0;
    color: #6b7280;
    font-size: 1rem;
    line-height: 1.5;
  }

  .error-banner,
  .success-banner {
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }

  .error-banner {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
  }

  .success-banner {
    background-color: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #16a34a;
  }

  .error-banner h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .error-banner ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .setting-group {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .group-title {
    margin: 0 0 1.5rem 0;
    color: #374151;
    font-size: 1.25rem;
    font-weight: 600;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 0.5rem;
  }

  .setting-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.5rem;
    padding: 1rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .setting-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .setting-info {
    flex: 1;
  }

  .setting-label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.25rem;
    font-size: 0.95rem;
  }

  .setting-description {
    margin: 0;
    font-size: 0.85rem;
    color: #6b7280;
    line-height: 1.4;
  }

  .setting-controls {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Form controls */
  input[type="number"],
  select {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    width: 120px;
  }

  input[type="number"]:focus,
  select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* Radio group */
  .radio-group {
    display: flex;
    gap: 1rem;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .radio-option input[type="radio"] {
    width: auto;
  }

  /* Toggle switch */
  .toggle {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    cursor: pointer;
  }

  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #cbd5e1;
    transition: 0.3s;
    border-radius: 24px;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .toggle input:checked + .toggle-slider {
    background-color: #3b82f6;
  }

  .toggle input:checked + .toggle-slider:before {
    transform: translateX(20px);
  }

  /* Buttons */
  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn-small {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }

  .btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .btn-primary {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #2563eb;
    border-color: #2563eb;
  }

  .btn-secondary {
    background-color: white;
    color: #6b7280;
    border-color: #d1d5db;
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: #f9fafb;
    color: #374151;
    border-color: #9ca3af;
  }

  .btn-danger {
    background-color: #ef4444;
    color: white;
    border-color: #ef4444;
  }

  .btn-danger:hover:not(:disabled) {
    background-color: #dc2626;
    border-color: #dc2626;
  }

  .settings-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: center;
  }

  .reset-confirmation {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    color: #374151;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .settings-header h2 {
      color: #f9fafb;
    }

    .settings-description,
    .setting-description {
      color: #9ca3af;
    }

    .setting-group {
      background: #374151;
      border-color: #4b5563;
    }

    .group-title {
      color: #d1d5db;
      border-bottom-color: #4b5563;
    }

    .setting-item {
      border-bottom-color: #4b5563;
    }

    .setting-label {
      color: #d1d5db;
    }

    input[type="number"],
    select {
      background-color: #4b5563;
      border-color: #6b7280;
      color: #f9fafb;
    }

    .toggle-slider {
      background-color: #4b5563;
    }

    .btn-secondary {
      background-color: #374151;
      color: #d1d5db;
      border-color: #4b5563;
    }

    .btn-secondary:hover:not(:disabled) {
      background-color: #4b5563;
      color: #f9fafb;
      border-color: #6b7280;
    }

    .error-banner {
      background-color: #450a0a;
      border-color: #7f1d1d;
      color: #fca5a5;
    }

    .success-banner {
      background-color: #052e16;
      border-color: #166534;
      color: #86efac;
    }

    .reset-confirmation {
      color: #d1d5db;
    }
  }

  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .settings-container {
      padding: 1rem;
    }

    .setting-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .setting-controls {
      align-self: stretch;
      justify-content: flex-end;
    }

    .settings-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }

    .reset-confirmation {
      flex-direction: column;
      gap: 0.5rem;
      align-items: stretch;
    }

    .reset-confirmation .btn {
      width: 100%;
    }

    input[type="number"],
    select {
      width: 100%;
    }

    .radio-group {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>