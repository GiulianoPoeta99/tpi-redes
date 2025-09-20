import React, { useState, useEffect } from 'react';
import ToastContainer, { type ToastMessage } from './Toast';
import SlidingWindow from './SlidingWindow';

const ReceiverView: React.FC = () => {
    const [port, setPort] = useState(8080);
    const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
    const [isConnected, setIsConnected] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    
    // Derived state for visualizer
    const [transferActive, setTransferActive] = useState(false);

    const addToast = (type: 'success' | 'error' | 'info', message: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, type, message }]);
    };

    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    useEffect(() => {
        const onLog = (log: string) => {
            try {
                const json = JSON.parse(log);
                if (json.type === 'SERVER_READY') {
                    setIsConnected(true);
                    addToast('success', `Listening on port ${json.port}`);
                } else if (json.type === 'TRANSFER_UPDATE') {
                    if (json.status === 'start') setTransferActive(true);
                    if (json.status === 'complete') {
                        setTransferActive(false);
                        addToast('success', `File Received: ${json.filename}`);
                    }
                } else if (json.type === 'ERROR') {
                    addToast('error', json.message);
                    setIsConnected(false);
                    setTransferActive(false);
                }
            } catch (e) { /* ignore */ }
        };
        
        if (window.api) window.api.onLog(onLog);
    }, []);

    const startServer = async () => {
        try {
            await window.api.startServer({ port, protocol, saveDir: './received_files', sniff: true }); // Sniff auto-enabled for dashboard? User said "sniffer in dashboard", so probably yes.
        } catch (e) {
            addToast('error', `Start failed: ${e}`);
        }
    };

    return (
        <div className="h-full flex flex-col relative">
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            
            {/* Control Bar */}
            <div className="flex items-end gap-4 mb-8">
                 <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Protocol</label>
                    <div className="flex bg-gray-900 rounded-lg p-1">
                        {['tcp', 'udp'].map(p => (
                            <button key={p} onClick={() => setProtocol(p as any)} 
                            className={`flex-1 py-2 text-sm rounded ${protocol === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                                {p.toUpperCase()}
                            </button>
                        ))}
                    </div>
                 </div>
                 <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Port</label>
                    <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" />
                 </div>
                 <button 
                    onClick={startServer}
                    disabled={isConnected}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all ${isConnected ? 'bg-green-600 cursor-default' : 'bg-blue-600 hover:bg-blue-500 hover:-translate-y-0.5'}`}
                 >
                    {isConnected ? 'SERVER RUNNING' : 'START SERVER'}
                 </button>
            </div>

            {/* Main Visual / Status Area */}
            <div className="flex-1 bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center relative overflow-hidden">
                {!isConnected ? (
                     <div className="text-center text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        <p className="text-lg font-medium">Server is Offline</p>
                        <p className="text-sm opacity-70">Configure settings above and click Start.</p>
                     </div>
                ) : (
                    <>
                        {transferActive ? (
                            <div className="w-full h-full p-4">
                                {/* Visualizer replaces logic when active */}
                                <SlidingWindow />
                            </div>
                        ) : (
                             <div className="text-center text-green-500 animate-pulse">
                                <svg className="w-20 h-20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <h3 className="text-2xl font-bold text-white">Ready to Receive</h3>
                                <p className="text-gray-400 mt-2">Waiting for incoming connections...</p>
                             </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ReceiverView;
