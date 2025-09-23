import React, { useState, useEffect } from 'react';
import ReceiverView from './ReceiverView';
import TransmitterView from './TransmitterView';
import MitmView from './MitmView';
import SnifferLog from './SnifferLog';
import StatsPanel from './StatsPanel';
import type { AppStats } from '../services/StorageService';
import { StorageService } from '../services/StorageService';

// Dashboard "Desktop" Layout with 3 modes + Persistent Sidebars
const Dashboard: React.FC = () => {
    const [mode, setMode] = useState<'receiver' | 'transmitter' | 'mitm'>('receiver');
    const [stats, setStats] = useState<AppStats>(StorageService.loadStats());

    // Listen for stats updates globally
    useEffect(() => {
        const handleStats = (newStats: any) => {
             // Basic accumulation logic or replacement
             setStats(prev => {
                 const updated = { ...prev, totalSent: newStats.total_sent || prev.totalSent, bytesSent: newStats.bytes_sent || prev.bytesSent };
                 StorageService.saveStats(updated);
                 return updated;
             });
        };

        if (window.api && window.api.onStatsUpdate) {
            window.api.onStatsUpdate(handleStats);
        }
    }, []);

    // Switching modes should hard-kill previous process to free ports
    const handleModeSwitch = async (newMode: 'receiver' | 'transmitter' | 'mitm') => {
        if (mode === newMode) return;
        
        // Stop current backend process
        try {
            await window.api.stopProcess();
            console.log("Stopped background process.");
        } catch (e) {
            console.error("Failed to stop process", e);
        }

        setMode(newMode);
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans">
            {/* Sidebar / Stats Area (Left or Right? User said "no side menu", but "stats in dashboard")
                User said: "packt sniffer and statistics should be in the dashboard... not side menu"
                Implying they should be visible widgets.
                Let's make a top-bar for navigation and a main grid for content + widgets.
            */}
            
            <div className="flex-1 flex flex-col h-full relative">
                {/* Top Navigation */}
                <header className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between shadow-md z-10">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            TPI Redes
                        </h1>
                        
                        {/* Segmented Control */}
                        <div className="flex bg-gray-900 rounded-lg p-1 ml-8">
                            {['receiver', 'transmitter', 'mitm'].map((m) => (
                                <button
                                    key={m}
                                    onClick={() => handleModeSwitch(m as any)}
                                    className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                                        mode === m 
                                        ? 'bg-gray-700 text-white shadow-lg' 
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {m.charAt(0).toUpperCase() + m.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                {/* Main Content Area - Grid Layout */}
                {/* Main Content Area - Split Layout */}
                <main className="flex-1 p-6 overflow-hidden flex gap-6">
                    
                    {/* LEFT COLUMN: Modes + Stats */}
                    <div className="flex-1 flex flex-col gap-6 min-w-0">
                        
                        {/* Primary Mode View (Occupies majority of left side) */}
                        <div className="flex-[3] bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-6 relative overflow-hidden">
                            <div className="h-full overflow-auto">
                                {mode === 'receiver' && <ReceiverView />}
                                {mode === 'transmitter' && <TransmitterView />}
                                {mode === 'mitm' && <MitmView />}
                            </div>
                        </div>

                        {/* Statistics Widget (Bottom of left side) */}
                        <div className="flex-1 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-4 flex flex-col justify-center">
                            <h3 className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wider">Network Stats</h3>
                            <StatsPanel stats={stats} />
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Packet Sniffer (Full Height) */}
                    <div className="flex-1 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden flex flex-col">
                        <div className="p-3 bg-gray-800/50 border-b border-gray-700 font-semibold text-sm text-gray-400 flex justify-between items-center">
                            <span>Packet Sniffer</span>
                            <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">Live Capture</span>
                        </div>
                        <div className="flex-1 overflow-auto p-0 relative">
                            <SnifferLog /> 
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
};

export default Dashboard;
