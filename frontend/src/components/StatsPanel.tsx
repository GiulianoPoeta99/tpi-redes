import React, { useEffect, useState } from 'react';

interface StatsState {
    rtt: number;
    throughput: number;
    progress: number;
}

const StatsPanel: React.FC = () => {
    const [stats, setStats] = useState<StatsState | null>(null);

    useEffect(() => {
        window.api.onStatsUpdate((data) => {
            setStats(data);
        });
    }, []);

    if (!stats) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Waiting for transfer statistics...
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            {/* Throughput Gauge */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none"></div>
                <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Throughput</h3>
                <div className="text-5xl font-bold text-white font-mono">
                    {stats.throughput.toFixed(2)}
                </div>
                <div className="text-blue-400 text-sm mt-1">MB/s</div>
            </div>

            {/* RTT Gauge */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none"></div>
                <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Latency (RTT)</h3>
                <div className="text-5xl font-bold text-white font-mono">
                    {stats.rtt.toFixed(0)}
                </div>
                <div className="text-purple-400 text-sm mt-1">ms</div>
            </div>

            {/* Progress Circle */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent pointer-events-none"></div>
                <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-4">Progress</h3>
                
                <div className="relative w-32 h-32">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle 
                            className="text-gray-700 stroke-current" 
                            strokeWidth="10" 
                            cx="50" 
                            cy="50" 
                            r="40" 
                            fill="transparent"
                        ></circle>
                        <circle 
                            className="text-green-500 progress-ring__circle stroke-current transition-all duration-500 ease-out" 
                            strokeWidth="10" 
                            strokeLinecap="round" 
                            cx="50" 
                            cy="50" 
                            r="40" 
                            fill="transparent" 
                            strokeDasharray="251.2" 
                            strokeDashoffset={251.2 - (251.2 * stats.progress) / 100}
                            transform="rotate(-90 50 50)"
                        ></circle>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">
                        {stats.progress.toFixed(0)}%
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsPanel;
