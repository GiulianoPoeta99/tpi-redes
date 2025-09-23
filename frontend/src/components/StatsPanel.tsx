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
    
    // Reformulated: 4 Metrics (Packets Sent/Recv, Bytes Sent/Recv)
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-full">
             {/* Packets Sent */}
             <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/10 p-4 rounded-xl border border-blue-500/20 flex flex-col justify-center relative overflow-hidden group">
                 <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Packets Sent</h4>
                 <p className="text-2xl font-mono text-white font-bold tracking-tighter">{stats.totalSent}</p>
                 <div className="absolute right-2 bottom-2 opacity-20"><span className="text-2xl">📤</span></div>
             </div>

             {/* Bytes Sent */}
             <div className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/10 p-4 rounded-xl border border-cyan-500/20 flex flex-col justify-center relative overflow-hidden group">
                 <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1">Data Sent</h4>
                 <p className="text-xl font-mono text-white font-bold tracking-tighter">{(stats.bytesSent / 1024 / 1024).toFixed(2)} MB</p>
                 <div className="absolute right-2 bottom-2 opacity-20"><span className="text-2xl">💾</span></div>
             </div>

             {/* Packets Recv */}
             <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/10 p-4 rounded-xl border border-purple-500/20 flex flex-col justify-center relative overflow-hidden group">
                 <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Packets Recv</h4>
                 <p className="text-2xl font-mono text-white font-bold tracking-tighter">{stats.totalReceived}</p>
                 <div className="absolute right-2 bottom-2 opacity-20"><span className="text-2xl">📥</span></div>
             </div>

             {/* Bytes Recv */}
             <div className="bg-gradient-to-br from-pink-900/30 to-pink-800/10 p-4 rounded-xl border border-pink-500/20 flex flex-col justify-center relative overflow-hidden group">
                 <h4 className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-1">Data Recv</h4>
                 <p className="text-xl font-mono text-white font-bold tracking-tighter">{(stats.bytesReceived / 1024 / 1024).toFixed(2)} MB</p>
                 <div className="absolute right-2 bottom-2 opacity-20"><span className="text-2xl">💾</span></div>
             </div>
        </div>
    );
};



export default StatsPanel;
