import type { AppStats } from '../services/StorageService';

interface StatsPanelProps {
    stats: AppStats;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
    // Adapter: convert AppStats (cumulative) to gauge values if needed, 
    // OR we just display what we have.
    // The previous StatsPanel expected { rtt, throughput, progress }.
    // AppStats has { bytesSent, bytesReceived, ... }.
    // User wants PERSISTENCE. AppStats is what we persist.
    // BUT live gauges need live "Rate" data (throughput).
    // Let's assume Dashboard passes mixed data or we calculate rate?
    // For now, let's just display what AppStats has: Total Sent/Recv.
    // IF we want graphs/speed, we need to track delta over time.
    // Let's update the UI to show Total Sent/Recv for now which is what persistence implies.
    // If user wants speed, we can compute it if we get updates frequently.
    
    // Actually, let's Keep it simple: Display Totals in Cards.
    return (
        <div className="grid grid-cols-2 gap-4">
             <div className="bg-gray-700/50 p-4 rounded-lg">
                 <h4 className="text-xs font-bold text-gray-400 uppercase">Total Sent</h4>
                 <p className="text-2xl font-mono text-blue-400">{stats.totalSent}</p>
                 <p className="text-xs text-gray-500">{(stats.bytesSent / 1024 / 1024).toFixed(2)} MB</p>
             </div>
             <div className="bg-gray-700/50 p-4 rounded-lg">
                 <h4 className="text-xs font-bold text-gray-400 uppercase">Total Received</h4>
                 <p className="text-2xl font-mono text-purple-400">{stats.totalReceived}</p>
                 <p className="text-xs text-gray-500">{(stats.bytesReceived / 1024 / 1024).toFixed(2)} MB</p>
             </div>
        </div>
    );
};



export default StatsPanel;
