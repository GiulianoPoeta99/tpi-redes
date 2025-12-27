export interface AppStats {
  totalSent: number;
  totalReceived: number;
  bytesSent: number;
  bytesReceived: number;
}

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

export const StorageService = {
  saveStats: (stats: AppStats) => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  },

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

  clearStats: () => {
    localStorage.removeItem(STATS_KEY);
  },

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

  addHistoryItem: (item: TransferHistoryItem) => {
    const history = StorageService.loadHistory();
    // Prepend new item, limit to 100
    const newHistory = [item, ...history].slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  },

  clearHistory: () => {
    localStorage.removeItem(HISTORY_KEY);
  },
};
