// Transfer history management store
import { writable, get, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { TransferRecord } from '../types';

export interface HistoryFilter {
  status?: 'completed' | 'failed' | 'cancelled';
  protocol?: 'tcp' | 'udp';
  mode?: 'sent' | 'received';
  filenameContains?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface HistorySortOptions {
  field: 'timestamp' | 'filename' | 'size' | 'duration' | 'status';
  direction: 'asc' | 'desc';
}

interface HistoryState {
  records: TransferRecord[];
  filter: HistoryFilter;
  sortOptions: HistorySortOptions;
  searchQuery: string;
  selectedRecord: TransferRecord | null;
  isLoading: boolean;
  developerMode: boolean;
}

const HISTORY_STORAGE_KEY = 'file-transfer-history';
const DEVELOPER_MODE_KEY = 'file-transfer-developer-mode';
const MAX_HISTORY_ITEMS = 1000;

function createHistoryStore() {
  const { subscribe, set, update } = writable<HistoryState>({
    records: [],
    filter: {},
    sortOptions: { field: 'timestamp', direction: 'desc' },
    searchQuery: '',
    selectedRecord: null,
    isLoading: false,
    developerMode: false
  });

  return {
    subscribe,
    set,
    update,

    // Initialize the history store
    initialize(): void {
      if (!browser) return;

      try {
        // Load history from localStorage
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (stored) {
          const records = JSON.parse(stored) as TransferRecord[];
          // Convert timestamp strings back to Date objects
          const parsedRecords = records.map(record => ({
            ...record,
            timestamp: new Date(record.timestamp)
          }));
          
          update(state => ({ ...state, records: parsedRecords }));
        }

        // Load developer mode setting
        const developerMode = localStorage.getItem(DEVELOPER_MODE_KEY) === 'true';
        update(state => ({ ...state, developerMode }));
      } catch (error) {
        console.warn('Failed to load transfer history:', error);
      }
    },

    // Add a new record to history
    addRecord(record: TransferRecord): void {
      update(state => {
        const newRecords = [record, ...state.records].slice(0, MAX_HISTORY_ITEMS);
        this.saveToStorage(newRecords);
        return { ...state, records: newRecords };
      });
    },

    // Update an existing record
    updateRecord(recordId: string, updates: Partial<TransferRecord>): void {
      update(state => {
        const newRecords = state.records.map(record =>
          record.id === recordId ? { ...record, ...updates } : record
        );
        this.saveToStorage(newRecords);
        return { ...state, records: newRecords };
      });
    },

    // Remove a record from history
    removeRecord(recordId: string): void {
      update(state => {
        const newRecords = state.records.filter(record => record.id !== recordId);
        this.saveToStorage(newRecords);
        return { ...state, records: newRecords };
      });
    },

    // Clear all history
    clearHistory(): void {
      update(state => {
        this.saveToStorage([]);
        return { ...state, records: [], selectedRecord: null };
      });
    },

    // Set filter options
    setFilter(filter: HistoryFilter): void {
      update(state => ({ ...state, filter }));
    },

    // Clear filter
    clearFilter(): void {
      update(state => ({ ...state, filter: {} }));
    },

    // Set sort options
    setSortOptions(sortOptions: HistorySortOptions): void {
      update(state => ({ ...state, sortOptions }));
    },

    // Set search query
    setSearchQuery(query: string): void {
      update(state => ({ ...state, searchQuery: query }));
    },

    // Select a record for detailed view
    selectRecord(record: TransferRecord | null): void {
      update(state => ({ ...state, selectedRecord: record }));
    },

    // Toggle developer mode
    toggleDeveloperMode(): void {
      update(state => {
        const newDeveloperMode = !state.developerMode;
        if (browser) {
          localStorage.setItem(DEVELOPER_MODE_KEY, newDeveloperMode.toString());
        }
        return { ...state, developerMode: newDeveloperMode };
      });
    },

    // Export history to JSON
    exportHistory(): string {
      const state = get({ subscribe });
      return JSON.stringify(state.records, null, 2);
    },

    // Import history from JSON
    importHistory(jsonData: string): { success: boolean; imported: number; errors: string[] } {
      try {
        const importedRecords = JSON.parse(jsonData) as TransferRecord[];
        const errors: string[] = [];
        let imported = 0;

        const validRecords = importedRecords.filter(record => {
          // Validate record structure
          if (!record.id || !record.filename || !record.timestamp) {
            errors.push(`Invalid record: missing required fields`);
            return false;
          }
          return true;
        });

        update(state => {
          // Merge with existing records, avoiding duplicates
          const existingIds = new Set(state.records.map(r => r.id));
          const newRecords = validRecords.filter(record => !existingIds.has(record.id));
          
          imported = newRecords.length;
          
          // Convert timestamps and merge
          const mergedRecords = [
            ...newRecords.map(record => ({
              ...record,
              timestamp: new Date(record.timestamp)
            })),
            ...state.records
          ].slice(0, MAX_HISTORY_ITEMS);

          this.saveToStorage(mergedRecords);
          return { ...state, records: mergedRecords };
        });

        return { success: true, imported, errors };
      } catch (error) {
        return { 
          success: false, 
          imported: 0, 
          errors: [`Failed to parse JSON: ${error}`] 
        };
      }
    },

    // Save records to localStorage
    saveToStorage(records: TransferRecord[]): void {
      if (!browser) return;

      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
      } catch (error) {
        console.error('Failed to save transfer history:', error);
      }
    }
  };
}

export const historyStore = createHistoryStore();

// Derived stores for filtered and sorted data
export const filteredHistory = derived(
  historyStore,
  $historyStore => {
    let filtered = $historyStore.records;

    // Apply search query
    if ($historyStore.searchQuery) {
      const query = $historyStore.searchQuery.toLowerCase();
      filtered = filtered.filter(record =>
        record.filename.toLowerCase().includes(query) ||
        record.target.toLowerCase().includes(query) ||
        record.checksum.toLowerCase().includes(query)
      );
    }

    // Apply filters
    const filter = $historyStore.filter;
    
    if (filter.status) {
      filtered = filtered.filter(record => record.status === filter.status);
    }
    
    if (filter.protocol) {
      filtered = filtered.filter(record => record.protocol === filter.protocol);
    }
    
    if (filter.mode) {
      filtered = filtered.filter(record => record.mode === filter.mode);
    }
    
    if (filter.filenameContains) {
      const query = filter.filenameContains.toLowerCase();
      filtered = filtered.filter(record => 
        record.filename.toLowerCase().includes(query)
      );
    }
    
    if (filter.fromDate) {
      filtered = filtered.filter(record => record.timestamp >= filter.fromDate!);
    }
    
    if (filter.toDate) {
      filtered = filtered.filter(record => record.timestamp <= filter.toDate!);
    }

    // Apply sorting
    const { field, direction } = $historyStore.sortOptions;
    filtered.sort((a, b) => {
      let aValue: any = a[field];
      let bValue: any = b[field];

      // Handle Date objects
      if (field === 'timestamp') {
        aValue = aValue.getTime();
        bValue = bValue.getTime();
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      let result = 0;
      if (aValue < bValue) result = -1;
      else if (aValue > bValue) result = 1;

      return direction === 'desc' ? -result : result;
    });

    return filtered;
  }
);

// Statistics derived store
export const historyStats = derived(
  historyStore,
  $historyStore => {
    const records = $historyStore.records;
    
    const totalTransfers = records.length;
    const completedTransfers = records.filter(r => r.status === 'completed').length;
    const failedTransfers = records.filter(r => r.status === 'failed').length;
    const cancelledTransfers = records.filter(r => r.status === 'cancelled').length;
    
    const totalBytes = records
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.size, 0);
    
    const totalDuration = records
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.duration, 0);
    
    const averageSpeed = totalDuration > 0 ? totalBytes / totalDuration : 0;
    
    const protocolStats = {
      tcp: records.filter(r => r.protocol === 'tcp').length,
      udp: records.filter(r => r.protocol === 'udp').length
    };
    
    const modeStats = {
      sent: records.filter(r => r.mode === 'sent').length,
      received: records.filter(r => r.mode === 'received').length
    };

    return {
      totalTransfers,
      completedTransfers,
      failedTransfers,
      cancelledTransfers,
      successRate: totalTransfers > 0 ? (completedTransfers / totalTransfers) * 100 : 0,
      totalBytes,
      totalDuration,
      averageSpeed,
      protocolStats,
      modeStats
    };
  }
);

// Auto-initialize when in browser environment
if (browser) {
  historyStore.initialize();
}