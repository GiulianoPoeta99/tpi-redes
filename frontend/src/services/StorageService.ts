export interface AppStats {
    totalSent: number;
    totalReceived: number;
    bytesSent: number;
    bytesReceived: number;
}

const STATS_KEY = 'tpi_redes_stats';

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
            bytesReceived: 0
        };
    },

    clearStats: () => {
        localStorage.removeItem(STATS_KEY);
    }
};
