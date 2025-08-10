<script lang="ts">
  import { historyStore, type HistoryFilter } from '../stores/history';

  let filter: HistoryFilter = {};
  let fromDateString = '';
  let toDateString = '';

  // Update filter when form values change
  $: {
    const newFilter: HistoryFilter = {};
    
    if (filter.status) newFilter.status = filter.status;
    if (filter.protocol) newFilter.protocol = filter.protocol;
    if (filter.mode) newFilter.mode = filter.mode;
    if (filter.filenameContains) newFilter.filenameContains = filter.filenameContains;
    
    if (fromDateString) {
      newFilter.fromDate = new Date(fromDateString);
    }
    
    if (toDateString) {
      newFilter.toDate = new Date(toDateString);
    }
    
    historyStore.setFilter(newFilter);
  }

  function clearFilters() {
    filter = {};
    fromDateString = '';
    toDateString = '';
    historyStore.clearFilter();
  }

  function hasActiveFilters(): boolean {
    return Object.keys($historyStore.filter).length > 0;
  }
</script>

<div class="history-filters">
  <div class="filters-header">
    <h6>Filters</h6>
    {#if hasActiveFilters()}
      <button class="btn btn-sm btn-clear" on:click={clearFilters}>
        Clear All
      </button>
    {/if}
  </div>
  
  <div class="filters-grid">
    <!-- Status Filter -->
    <div class="filter-group">
      <label for="status-filter">Status</label>
      <select id="status-filter" bind:value={filter.status}>
        <option value="">All Statuses</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <!-- Protocol Filter -->
    <div class="filter-group">
      <label for="protocol-filter">Protocol</label>
      <select id="protocol-filter" bind:value={filter.protocol}>
        <option value="">All Protocols</option>
        <option value="tcp">TCP</option>
        <option value="udp">UDP</option>
      </select>
    </div>

    <!-- Mode Filter -->
    <div class="filter-group">
      <label for="mode-filter">Mode</label>
      <select id="mode-filter" bind:value={filter.mode}>
        <option value="">All Modes</option>
        <option value="sent">Sent</option>
        <option value="received">Received</option>
      </select>
    </div>

    <!-- Filename Filter -->
    <div class="filter-group">
      <label for="filename-filter">Filename Contains</label>
      <input
        id="filename-filter"
        type="text"
        placeholder="Search filename..."
        bind:value={filter.filenameContains}
      />
    </div>

    <!-- Date Range Filters -->
    <div class="filter-group">
      <label for="from-date-filter">From Date</label>
      <input
        id="from-date-filter"
        type="datetime-local"
        bind:value={fromDateString}
      />
    </div>

    <div class="filter-group">
      <label for="to-date-filter">To Date</label>
      <input
        id="to-date-filter"
        type="datetime-local"
        bind:value={toDateString}
      />
    </div>
  </div>

  <!-- Active Filters Summary -->
  {#if hasActiveFilters()}
    <div class="active-filters">
      <span class="active-filters-label">Active filters:</span>
      <div class="filter-tags">
        {#if $historyStore.filter.status}
          <span class="filter-tag">
            Status: {$historyStore.filter.status}
            <button on:click={() => { filter.status = undefined; }}>×</button>
          </span>
        {/if}
        
        {#if $historyStore.filter.protocol}
          <span class="filter-tag">
            Protocol: {$historyStore.filter.protocol.toUpperCase()}
            <button on:click={() => { filter.protocol = undefined; }}>×</button>
          </span>
        {/if}
        
        {#if $historyStore.filter.mode}
          <span class="filter-tag">
            Mode: {$historyStore.filter.mode}
            <button on:click={() => { filter.mode = undefined; }}>×</button>
          </span>
        {/if}
        
        {#if $historyStore.filter.filenameContains}
          <span class="filter-tag">
            Filename: "{$historyStore.filter.filenameContains}"
            <button on:click={() => { filter.filenameContains = undefined; }}>×</button>
          </span>
        {/if}
        
        {#if $historyStore.filter.fromDate}
          <span class="filter-tag">
            From: {$historyStore.filter.fromDate.toLocaleDateString()}
            <button on:click={() => { fromDateString = ''; }}>×</button>
          </span>
        {/if}
        
        {#if $historyStore.filter.toDate}
          <span class="filter-tag">
            To: {$historyStore.filter.toDate.toLocaleDateString()}
            <button on:click={() => { toDateString = ''; }}>×</button>
          </span>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .history-filters {
    padding: 1rem;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
  }

  .filters-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .filters-header h6 {
    margin: 0;
    color: #495057;
    font-weight: 600;
  }

  .filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .filter-group label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #6c757d;
  }

  .filter-group select,
  .filter-group input {
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.9rem;
    background: white;
  }

  .filter-group select:focus,
  .filter-group input:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }

  .active-filters {
    padding-top: 1rem;
    border-top: 1px solid #dee2e6;
  }

  .active-filters-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #6c757d;
    margin-right: 0.5rem;
  }

  .filter-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .filter-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: #007bff;
    color: white;
    border-radius: 12px;
    font-size: 0.8rem;
  }

  .filter-tag button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0;
    margin-left: 0.25rem;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }

  .filter-tag button:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .btn {
    padding: 0.25rem 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s;
  }

  .btn:hover {
    background: #f8f9fa;
  }

  .btn-sm {
    padding: 0.125rem 0.375rem;
    font-size: 0.75rem;
  }

  .btn-clear {
    background: #6c757d;
    color: white;
    border-color: #6c757d;
  }

  .btn-clear:hover {
    background: #5a6268;
    border-color: #545b62;
  }
</style>