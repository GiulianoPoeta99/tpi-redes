<script lang="ts">
  import type { TransferRecord } from '../types';
  import { TransferUtils } from '../types';
  import { historyStore } from '../stores/history';

  export let record: TransferRecord;

  function formatTimestamp(timestamp: Date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    }).format(timestamp);
  }

  function getStatusColor(status: TransferRecord['status']) {
    switch (status) {
      case 'completed': return '#2e7d32';
      case 'failed': return '#c62828';
      case 'cancelled': return '#7b1fa2';
      default: return '#6c757d';
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
    });
  }

  function calculateSpeed() {
    if (record.duration > 0 && record.status === 'completed') {
      return TransferUtils.formatSpeed(record.size / record.duration);
    }
    return 'N/A';
  }
</script>

<div class="transfer-details">
  <!-- Basic Information -->
  <section class="details-section">
    <h5>Transfer Information</h5>
    <div class="details-grid">
      <div class="detail-item">
        <label>Transfer ID</label>
        <div class="detail-value">
          <code>{record.id}</code>
          <button 
            class="copy-btn" 
            on:click={() => copyToClipboard(record.id)}
            title="Copy to clipboard"
          >
            📋
          </button>
        </div>
      </div>
      
      <div class="detail-item">
        <label>Status</label>
        <div class="detail-value">
          <span 
            class="status-indicator" 
            style="background-color: {getStatusColor(record.status)}"
          ></span>
          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
        </div>
      </div>
      
      <div class="detail-item">
        <label>Timestamp</label>
        <div class="detail-value">
          {formatTimestamp(record.timestamp)}
        </div>
      </div>
      
      <div class="detail-item">
        <label>Duration</label>
        <div class="detail-value">
          {TransferUtils.formatDuration(record.duration)}
        </div>
      </div>
    </div>
  </section>

  <!-- File Information -->
  <section class="details-section">
    <h5>File Information</h5>
    <div class="details-grid">
      <div class="detail-item">
        <label>Filename</label>
        <div class="detail-value">
          <span class="filename">{record.filename}</span>
          <button 
            class="copy-btn" 
            on:click={() => copyToClipboard(record.filename)}
            title="Copy filename"
          >
            📋
          </button>
        </div>
      </div>
      
      <div class="detail-item">
        <label>File Size</label>
        <div class="detail-value">
          {TransferUtils.formatBytes(record.size)}
          <span class="size-bytes">({record.size.toLocaleString()} bytes)</span>
        </div>
      </div>
      
      <div class="detail-item">
        <label>Checksum (SHA-256)</label>
        <div class="detail-value">
          <code class="checksum">{record.checksum || 'N/A'}</code>
          {#if record.checksum}
            <button 
              class="copy-btn" 
              on:click={() => copyToClipboard(record.checksum)}
              title="Copy checksum"
            >
              📋
            </button>
          {/if}
        </div>
      </div>
    </div>
  </section>

  <!-- Network Information -->
  <section class="details-section">
    <h5>Network Information</h5>
    <div class="details-grid">
      <div class="detail-item">
        <label>Mode</label>
        <div class="detail-value">
          <span class="mode-badge">
            {record.mode === 'sent' ? '📤 Sent' : '📥 Received'}
          </span>
        </div>
      </div>
      
      <div class="detail-item">
        <label>Protocol</label>
        <div class="detail-value">
          <span class="protocol-badge protocol-{record.protocol}">
            {record.protocol.toUpperCase()}
          </span>
        </div>
      </div>
      
      <div class="detail-item">
        <label>Target Address</label>
        <div class="detail-value">
          <code>{record.target}</code>
          <button 
            class="copy-btn" 
            on:click={() => copyToClipboard(record.target)}
            title="Copy target address"
          >
            📋
          </button>
        </div>
      </div>
      
      <div class="detail-item">
        <label>Average Speed</label>
        <div class="detail-value">
          {calculateSpeed()}
        </div>
      </div>
    </div>
  </section>

  <!-- Error Information (if applicable) -->
  {#if record.error}
    <section class="details-section error-section">
      <h5>Error Information</h5>
      <div class="error-content">
        <div class="error-message">
          <strong>Error:</strong> {record.error}
        </div>
        <button 
          class="copy-btn" 
          on:click={() => copyToClipboard(record.error || '')}
          title="Copy error message"
        >
          📋 Copy Error
        </button>
      </div>
    </section>
  {/if}

  <!-- Developer Mode: Network Logs -->
  {#if $historyStore.developerMode}
    <section class="details-section developer-section">
      <h5>🔧 Developer Information</h5>
      <div class="developer-content">
        <div class="detail-item">
          <label>Raw Record Data</label>
          <div class="detail-value">
            <pre class="json-data">{JSON.stringify(record, null, 2)}</pre>
            <button 
              class="copy-btn" 
              on:click={() => copyToClipboard(JSON.stringify(record, null, 2))}
              title="Copy raw data"
            >
              📋 Copy JSON
            </button>
          </div>
        </div>
        
        <!-- Network logs would go here if available -->
        <div class="detail-item">
          <label>Network Logs</label>
          <div class="detail-value">
            <p class="no-logs">Network logs not available for this transfer.</p>
            <small>Enable developer mode before starting transfers to capture detailed network logs.</small>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <!-- Actions -->
  <section class="details-section actions-section">
    <h5>Actions</h5>
    <div class="action-buttons">
      <button 
        class="btn btn-secondary"
        on:click={() => copyToClipboard(JSON.stringify(record, null, 2))}
      >
        📋 Copy Record Data
      </button>
      
      {#if record.checksum}
        <button 
          class="btn btn-secondary"
          on:click={() => copyToClipboard(record.checksum)}
        >
          🔐 Copy Checksum
        </button>
      {/if}
      
      <button 
        class="btn btn-danger"
        on:click={() => {
          if (confirm('Are you sure you want to remove this transfer record?')) {
            historyStore.removeRecord(record.id);
          }
        }}
      >
        🗑️ Remove Record
      </button>
    </div>
  </section>
</div>

<style>
  .transfer-details {
    max-width: 800px;
    max-height: 80vh;
    overflow-y: auto;
    padding: 1rem;
  }

  .details-section {
    margin-bottom: 2rem;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    overflow: hidden;
  }

  .details-section h5 {
    margin: 0;
    padding: 1rem;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    font-weight: 600;
    color: #495057;
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    padding: 1rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .detail-item label {
    font-weight: 600;
    color: #6c757d;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .detail-value {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    word-break: break-all;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }

  .filename {
    font-weight: 500;
  }

  .size-bytes {
    color: #6c757d;
    font-size: 0.8rem;
  }

  .checksum {
    font-family: monospace;
    font-size: 0.8rem;
    background: #f8f9fa;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    word-break: break-all;
  }

  .mode-badge,
  .protocol-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .protocol-badge {
    background: #e3f2fd;
    color: #1976d2;
  }

  .protocol-badge.protocol-tcp {
    background: #e8f5e8;
    color: #2e7d32;
  }

  .protocol-badge.protocol-udp {
    background: #fff3e0;
    color: #f57c00;
  }

  .copy-btn {
    background: none;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s;
  }

  .copy-btn:hover {
    background: #f8f9fa;
    border-color: #adb5bd;
  }

  .error-section {
    border-color: #dc3545;
  }

  .error-section h5 {
    background: #f8d7da;
    color: #721c24;
  }

  .error-content {
    padding: 1rem;
  }

  .error-message {
    background: #f8d7da;
    color: #721c24;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    border: 1px solid #f5c6cb;
  }

  .developer-section {
    border-color: #17a2b8;
  }

  .developer-section h5 {
    background: #d1ecf1;
    color: #0c5460;
  }

  .developer-content {
    padding: 1rem;
  }

  .json-data {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    padding: 1rem;
    font-size: 0.8rem;
    overflow-x: auto;
    max-height: 300px;
    overflow-y: auto;
  }

  .no-logs {
    color: #6c757d;
    font-style: italic;
    margin: 0;
  }

  .actions-section {
    border-color: #6c757d;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .btn:hover {
    background: #f8f9fa;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
    border-color: #6c757d;
  }

  .btn-secondary:hover {
    background: #5a6268;
    border-color: #545b62;
  }

  .btn-danger {
    background: #dc3545;
    color: white;
    border-color: #dc3545;
  }

  .btn-danger:hover {
    background: #c82333;
    border-color: #bd2130;
  }
</style>