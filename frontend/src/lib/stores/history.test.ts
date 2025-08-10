import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { historyStore, filteredHistory, historyStats } from './history';
import type { TransferRecord } from '../types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: true
}));

describe('History Store', () => {
  const mockRecord: TransferRecord = {
    id: 'test-123',
    filename: 'test.txt',
    size: 1024,
    mode: 'sent',
    protocol: 'tcp',
    target: '192.168.1.100:8080',
    status: 'completed',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    duration: 30,
    checksum: 'abc123def456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    historyStore.set({
      records: [],
      filter: {},
      sortOptions: { field: 'timestamp', direction: 'desc' },
      searchQuery: '',
      selectedRecord: null,
      isLoading: false,
      developerMode: false
    });
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const state = get(historyStore);
      expect(state.records).toEqual([]);
      expect(state.filter).toEqual({});
      expect(state.searchQuery).toBe('');
      expect(state.selectedRecord).toBeNull();
      expect(state.developerMode).toBe(false);
    });

    it('should load history from localStorage on initialization', () => {
      const storedRecords = [mockRecord];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedRecords));

      historyStore.initialize();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('file-transfer-history');
      const state = get(historyStore);
      expect(state.records).toHaveLength(1);
      expect(state.records[0].id).toBe('test-123');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      historyStore.initialize();

      const state = get(historyStore);
      expect(state.records).toEqual([]);
    });
  });

  describe('record management', () => {
    it('should add a new record', () => {
      historyStore.addRecord(mockRecord);

      const state = get(historyStore);
      expect(state.records).toHaveLength(1);
      expect(state.records[0]).toEqual(mockRecord);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should update an existing record', () => {
      historyStore.addRecord(mockRecord);
      historyStore.updateRecord('test-123', { status: 'failed', error: 'Network error' });

      const state = get(historyStore);
      expect(state.records[0].status).toBe('failed');
      expect(state.records[0].error).toBe('Network error');
    });

    it('should remove a record', () => {
      historyStore.addRecord(mockRecord);
      historyStore.removeRecord('test-123');

      const state = get(historyStore);
      expect(state.records).toHaveLength(0);
    });

    it('should clear all history', () => {
      historyStore.addRecord(mockRecord);
      historyStore.clearHistory();

      const state = get(historyStore);
      expect(state.records).toHaveLength(0);
      expect(state.selectedRecord).toBeNull();
    });

    it('should limit records to maximum count', () => {
      // Add more than MAX_HISTORY_ITEMS (1000) records
      for (let i = 0; i < 1005; i++) {
        historyStore.addRecord({
          ...mockRecord,
          id: `test-${i}`,
          filename: `test-${i}.txt`
        });
      }

      const state = get(historyStore);
      expect(state.records).toHaveLength(1000);
    });
  });

  describe('filtering and sorting', () => {
    beforeEach(() => {
      const records: TransferRecord[] = [
        { ...mockRecord, id: '1', status: 'completed', protocol: 'tcp', mode: 'sent' },
        { ...mockRecord, id: '2', status: 'failed', protocol: 'udp', mode: 'received' },
        { ...mockRecord, id: '3', status: 'cancelled', protocol: 'tcp', mode: 'sent' },
      ];
      
      historyStore.update(state => ({ ...state, records }));
    });

    it('should filter by status', () => {
      historyStore.setFilter({ status: 'completed' });

      const filtered = get(filteredHistory);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('completed');
    });

    it('should filter by protocol', () => {
      historyStore.setFilter({ protocol: 'tcp' });

      const filtered = get(filteredHistory);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(r => r.protocol === 'tcp')).toBe(true);
    });

    it('should filter by mode', () => {
      historyStore.setFilter({ mode: 'sent' });

      const filtered = get(filteredHistory);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(r => r.mode === 'sent')).toBe(true);
    });

    it('should filter by filename contains', () => {
      historyStore.update(state => ({
        ...state,
        records: [
          { ...mockRecord, id: '1', filename: 'document.pdf' },
          { ...mockRecord, id: '2', filename: 'image.jpg' },
          { ...mockRecord, id: '3', filename: 'document.txt' },
        ]
      }));

      historyStore.setFilter({ filenameContains: 'document' });

      const filtered = get(filteredHistory);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(r => r.filename.includes('document'))).toBe(true);
    });

    it('should search by query', () => {
      historyStore.update(state => ({
        ...state,
        records: [
          { ...mockRecord, id: '1', filename: 'important.txt' },
          { ...mockRecord, id: '2', filename: 'backup.zip' },
          { ...mockRecord, id: '3', target: 'important-server:8080' },
        ]
      }));

      historyStore.setSearchQuery('important');

      const filtered = get(filteredHistory);
      expect(filtered).toHaveLength(2);
    });

    it('should sort records', () => {
      historyStore.setSortOptions({ field: 'filename', direction: 'asc' });

      const filtered = get(filteredHistory);
      expect(filtered[0].filename <= filtered[1].filename).toBe(true);
    });

    it('should clear filters', () => {
      historyStore.setFilter({ status: 'completed' });
      historyStore.clearFilter();

      const state = get(historyStore);
      expect(state.filter).toEqual({});
    });
  });

  describe('developer mode', () => {
    it('should toggle developer mode', () => {
      historyStore.toggleDeveloperMode();

      const state = get(historyStore);
      expect(state.developerMode).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('file-transfer-developer-mode', 'true');
    });
  });

  describe('import/export', () => {
    it('should export history as JSON', () => {
      historyStore.addRecord(mockRecord);

      const exported = historyStore.exportHistory();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('test-123');
    });

    it('should import valid history data', () => {
      const importData = JSON.stringify([mockRecord]);

      const result = historyStore.importHistory(importData);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);

      const state = get(historyStore);
      expect(state.records).toHaveLength(1);
    });

    it('should handle invalid import data', () => {
      const result = historyStore.importHistory('invalid json');

      expect(result.success).toBe(false);
      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
    });

    it('should avoid duplicate records during import', () => {
      historyStore.addRecord(mockRecord);
      const importData = JSON.stringify([mockRecord]); // Same record

      const result = historyStore.importHistory(importData);

      expect(result.imported).toBe(0); // No new records imported
      const state = get(historyStore);
      expect(state.records).toHaveLength(1); // Still only one record
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      const records: TransferRecord[] = [
        { ...mockRecord, id: '1', status: 'completed', size: 1000, duration: 10 },
        { ...mockRecord, id: '2', status: 'completed', size: 2000, duration: 20 },
        { ...mockRecord, id: '3', status: 'failed', size: 500, duration: 0 },
        { ...mockRecord, id: '4', status: 'cancelled', size: 300, duration: 0 },
      ];
      
      historyStore.update(state => ({ ...state, records }));
    });

    it('should calculate correct statistics', () => {
      const stats = get(historyStats);

      expect(stats.totalTransfers).toBe(4);
      expect(stats.completedTransfers).toBe(2);
      expect(stats.failedTransfers).toBe(1);
      expect(stats.cancelledTransfers).toBe(1);
      expect(stats.successRate).toBe(50);
      expect(stats.totalBytes).toBe(3000); // Only completed transfers
      expect(stats.totalDuration).toBe(30); // Only completed transfers
      expect(stats.averageSpeed).toBe(100); // 3000 bytes / 30 seconds
    });

    it('should handle empty history in statistics', () => {
      historyStore.clearHistory();
      const stats = get(historyStats);

      expect(stats.totalTransfers).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageSpeed).toBe(0);
    });
  });
});