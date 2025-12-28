/**
 * Statistics for the application session.
 */
export interface AppStats {
  totalSent: number;
  totalReceived: number;
  bytesSent: number;
  bytesReceived: number;
}

/**
 * Record of a completed file transfer.
 */
export interface TransferHistoryItem {
  id: string;
  timestamp: number;
  filename: string;
  size: number;
  direction: 'sent' | 'received';
  status: 'success' | 'failed' | 'cancelled';
  protocol: string;
}

const STATS_KEY = 'tpi_redes_stats';
const HISTORY_KEY = 'tpi_redes_history';

/**
 * Service to manage persistence of application stats and history using LocalStorage.
 */
export const StorageService = {
  /**
   * Save current application stats.
   * @param stats - The stats object to persists.
   */
  saveStats: (stats: AppStats) => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  },

  /**
   * Load application stats from storage.
   *
   * @returns The loaded stats object, or a zeroed object if no data exists.
   */
  loadStats: (): AppStats => {
    const data = localStorage.getItem(STATS_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse stats', e);
      }
    }
    return {
      totalSent: 0,
      totalReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
    };
  },

  /**
   * Clear all saved statistics.
   */
  clearStats: () => {
    localStorage.removeItem(STATS_KEY);
  },

  /**
   * Load transfer history from storage.
   *
   * @returns Array of history items, or empty array if no data exists.
   */
  loadHistory: (): TransferHistoryItem[] => {
    const data = localStorage.getItem(HISTORY_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
    return [];
  },

  /**
   * Add a new item to the transfer history.
   * Maintains a maximum of 100 most recent items.
   *
   * @param item - The history item to add.
   */
  addHistoryItem: (item: TransferHistoryItem) => {
    const history = StorageService.loadHistory();
    const newHistory = [item, ...history].slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  },

  /**
   * Clear all transfer history.
   */
  clearHistory: () => {
    localStorage.removeItem(HISTORY_KEY);
  },
};
