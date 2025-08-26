import React, { useState } from 'react';
import TransferView from './TransferView';
import SnifferLog from './SnifferLog';
import StatsPanel from './StatsPanel';

type View = 'transfer' | 'sniffer' | 'stats';

const Dashboard: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('transfer');

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        TPI Redes
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">File Transfer & Sniffer</p>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <SidebarItem 
                        label="Transfer" 
                        active={currentView === 'transfer'} 
                        onClick={() => setCurrentView('transfer')} 
                    />
                    <SidebarItem 
                        label="Packet Sniffer" 
                        active={currentView === 'sniffer'} 
                        onClick={() => setCurrentView('sniffer')} 
                    />
                    <SidebarItem 
                        label="Statistics" 
                        active={currentView === 'stats'} 
                        onClick={() => setCurrentView('stats')} 
                    />
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm text-gray-300">System Online</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-0 pointer-events-none"></div>
                <div className="relative z-10 h-full p-8 overflow-y-auto">
                    {currentView === 'transfer' && <TransferView />}
                    {currentView === 'sniffer' && <SnifferLog />}
                    {currentView === 'stats' && <StatsPanel />}
                </div>
            </main>
        </div>
    );
};

const SidebarItem: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
            active 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
        }`}
    >
        {label}
    </button>
);

export default Dashboard;
