<script lang="ts">
  import { onMount } from 'svelte';
  import { historyStore, filteredHistory, historyStats, type HistoryFilter, type HistorySortOptions } from '../stores/history';
  import type { TransferRecord } from '../types';
  import { TransferUtils } from '../types';
  import TransferHistoryDetails from './TransferHistoryDetails.svelte';
  import TransferHistoryFilters from './TransferHistoryFilters.svelte';
  import TransferHistoryStats from './TransferHistoryStats.svelte';

  export let showDetails = false;
  export let showFilters = true;
  export let showStats = true;
  export let maxHeight = '400px';

  let searchQuery = '';
  let selectedRecord: TransferRecord | null = null;
  let showDetailsModal = false;
  let showExportModal = false;
  let showImportModal = false;
  let importData = '';
  let importResult: { success: boolean; imported: number; errors: string[] } | null = null;

  $: historyStore.setSearchQuery(searchQuery);

  function handleRecordClick(record: TransferRecord) {
    selectedRecord = record;
    historyStore.selectRecord(record);
    if (showDetails) {
      showDetailsModal = true;
    }
  }

  function handleSort(field: HistorySortOptions['field']) {
    const currentSort = $historyStore.sortOptions;
    const direction = currentSort.field === field && currentSort.direction === 'desc' ? 'asc' : 'desc';
    historyStore.setSortOptions({ field, direction });
  }

  function getSortIcon(field: HistorySortOptions['field']) {
    const currentSort = $historyStore.sortOptions;
    if (currentSort.field !== field) return '↕️';
    return currentSort.direction === 'desc' ? '↓' : '↑';
  }

  function getStatusIcon(status: TransferRecord['status']) {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '⏹️';
      default: return '❓';
    }
  }

  function getProtocolBadge(protocol: TransferRecord['protocol']) {
    return protocol.toUpperCase();
  }

  function getModeBadge(mode: TransferRecord['mode']) {
    return mode === 'sent' ? '📤' : '📥';
  }

  function formatTimestamp(timestamp: Date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  }

  function handleExport() {
    const data = historyStore.exportHistory();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transfer-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showExportModal = false;
  }

  function handleImport() {
    if (!importData.trim()) return;
    
    importResult = historyStore.importHistory(importData);
    if (importResult.success) {
      importData = '';
      setTimeout(() => {
        showImportModal = false;
        importResult = null;
      }, 3000);
    }
  }

  function clearHistory() {
    if (confirm('Are you sure you want to clear all transfer history? This action cannot be undone.')) {
      historyStore.clearHistory();
    }
  }

  function removeRecord(recordId: string, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to remove this transfer record?')) {
      historyStore.removeRecord(recordId);
    }
  }
</script>

<div class="transfer-history">
  <!-- Header -->
  <div class="history-header">
    <h3>Transfer History</h3>
    <div class="header-actions">
      <button 
        class="btn btn-sm"
        on:click={() => showExportModal = true}
        title="Export History"
      >
        📤 Export
      </button>
      <button 
        class="btn btn-sm"
        on:click={() => showImportModal = true}
        title="Import History"
      >
        📥 Import
      </button>
      <button 
        class="btn btn-sm btn-danger"
        on:click={clearHistory}
        title="Clear History"
      >
        🗑️ Clear
      </button>
      <button 
        class="btn btn-sm"
        on:click={() => historyStore.toggleDeveloperMode()}
        class:active={$historyStore.developerMode}
        title="Toggle Developer Mode"
      >
        🔧 Dev Mode
      </button>
    </div>
  </div>

  <!-- Search -->
  <div class="search-bar">
    <input
      type="text"
      placeholder="Search transfers..."
      bind:value={searchQuery}
      class="search-input"
    />
  </div>

  <!-- Filters -->
  {#if showFilters}
    <TransferHistoryFilters />
  {/if}

  <!-- Statistics -->
  {#if showStats}
    <TransferHistoryStats />
  {/if}

  <!-- History Table -->
  <div class="history-table-container" style="max-height: {maxHeight}">
    {#if $filteredHistory.length === 0}
      <div class="empty-state">
        <p>No transfer records found</p>
        {#if searchQuery || Object.keys($historyStore.filter).length > 0}
          <button class="btn btn-sm" on:click={() => {
            searchQuery = '';
            historyStore.clearFilter();
          }}>
            Clear filters
          </button>
        {/if}
      </div>
    {:else}
      <table class="history-table">
        <thead>
          <tr>
            <th class="sortable" on:click={() => handleSort('timestamp')}>
              Time {getSortIcon('timestamp')}
            </th>
            <th class="sortable" on:click={() => handleSort('filename')}>
              File {getSortIcon('filename')}
            </th>
            <th class="sortable" on:click={() => handleSort('size')}>
              Size {getSortIcon('size')}
            </th>
            <th>Mode</th>
            <th>Protocol</th>
            <th>Target</th>
            <th class="sortable" on:click={() => handleSort('status')}>
              Status {getSortIcon('status')}
            </th>
            <th class="sortable" on:click={() => handleSort('duration')}>
              Duration {getSortIcon('duration')}
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each $filteredHistory as record (record.id)}
            <tr 
              class="history-row"
              class:clickable={showDetails}
              on:click={() => handleRecordClick(record)}
            >
              <td class="timestamp">
                {formatTimestamp(record.timestamp)}
              </td>
              <td class="filename" title={record.filename}>
                {record.filename}
              </td>
              <td class="size">
                {TransferUtils.formatBytes(record.size)}
              </td>
              <td class="mode">
                <span class="mode-badge">
                  {getModeBadge(record.mode)} {record.mode}
                </span>
              </td>
              <td class="protocol">
                <span class="protocol-badge protocol-{record.protocol}">
                  {getProtocolBadge(record.protocol)}
                </span>
              </td>
              <td class="target" title={record.target}>
                {record.target}
              </td>
              <td class="status">
                <span class="status-badge status-{record.status}">
                  {getStatusIcon(record.status)} {record.status}
                </span>
              </td>
              <td class="duration">
                {TransferUtils.formatDuration(record.duration)}
              </td>
              <td class="actions">
                <button 
                  class="btn btn-xs"
                  on:click={(e) => removeRecord(record.id, e)}
                  title="Remove record"
                >
                  🗑️
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

<!-- Details Modal -->
{#if showDetailsModal && selectedRecord}
  <div class="modal-overlay" on:click={() => showDetailsModal = false}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h4>Transfer Details</h4>
        <button class="modal-close" on:click={() => showDetailsModal = false}>×</button>
      </div>
      <TransferHistoryDetails record={selectedRecord} />
    </div>
  </div>
{/if}

<!-- Export Modal -->
{#if showExportModal}
  <div class="modal-overlay" on:click={() => showExportModal = false}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h4>Export Transfer History</h4>
        <button class="modal-close" on:click={() => showExportModal = false}>×</button>
      </div>
      <div class="modal-body">
        <p>Export all transfer history records to a JSON file.</p>
        <p><strong>Records to export:</strong> {$historyStore.records.length}</p>
        <div class="modal-actions">
          <button class="btn" on:click={handleExport}>Download JSON</button>
          <button class="btn btn-secondary" on:click={() => showExportModal = false}>Cancel</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Import Modal -->
{#if showImportModal}
  <div class="modal-overlay" on:click={() => showImportModal = false}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h4>Import Transfer History</h4>
        <button class="modal-close" on:click={() => showImportModal = false}>×</button>
      </div>
      <div class="modal-body">
        <p>Paste JSON data from a previously exported history file:</p>
        <textarea
          bind:value={importData}
          placeholder="Paste JSON data here..."
          rows="10"
          class="import-textarea"
        ></textarea>
        
        {#if importResult}
          <div class="import-result" class:success={importResult.success} class:error={!importResult.success}>
            {#if importResult.success}
              <p>✅ Successfully imported {importResult.imported} records!</p>
            {:else}
              <p>❌ Import failed:</p>
              <ul>
                {#each importResult.errors as error}
                  <li>{error}</li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
        
        <div class="modal-actions">
          <button class="btn" on:click={handleImport} disabled={!importData.trim()}>
            Import
          </button>
          <button class="btn btn-secondary" on:click={() => showImportModal = false}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .transfer-history {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
  }

  .history-header h3 {
    margin: 0;
    color: #333;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .search-bar {
    padding: 1rem;
    border-bottom: 1px solid #e9ecef;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .history-table-container {
    overflow-y: auto;
  }

  .history-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  .history-table th,
  .history-table td {
    padding: 0.75rem 0.5rem;
    text-align: left;
    border-bottom: 1px solid #e9ecef;
  }

  .history-table th {
    background: #f8f9fa;
    font-weight: 600;
    color: #495057;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .sortable {
    cursor: pointer;
    user-select: none;
  }

  .sortable:hover {
    background: #e9ecef;
  }

  .history-row {
    transition: background-color 0.2s;
  }

  .history-row:hover {
    background: #f8f9fa;
  }

  .history-row.clickable {
    cursor: pointer;
  }

  .filename {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .target {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: monospace;
    font-size: 0.8rem;
  }

  .mode-badge,
  .protocol-badge,
  .status-badge {
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
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

  .status-badge.status-completed {
    background: #e8f5e8;
    color: #2e7d32;
  }

  .status-badge.status-failed {
    background: #ffebee;
    color: #c62828;
  }

  .status-badge.status-cancelled {
    background: #f3e5f5;
    color: #7b1fa2;
  }

  .empty-state {
    padding: 2rem;
    text-align: center;
    color: #6c757d;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
  }

  .modal-header h4 {
    margin: 0;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6c757d;
  }

  .modal-body {
    padding: 1rem;
  }

  .modal-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .import-textarea {
    width: 100%;
    min-height: 200px;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.85rem;
    resize: vertical;
  }

  .import-result {
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: 4px;
  }

  .import-result.success {
    background: #e8f5e8;
    color: #2e7d32;
    border: 1px solid #c8e6c9;
  }

  .import-result.error {
    background: #ffebee;
    color: #c62828;
    border: 1px solid #ffcdd2;
  }

  .import-result ul {
    margin: 0.5rem 0 0 1rem;
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

  .btn.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }

  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
  }

  .btn-xs {
    padding: 0.125rem 0.25rem;
    font-size: 0.7rem;
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

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>