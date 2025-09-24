import React, { useState, useEffect } from 'react';
import SlidingWindow from './SlidingWindow';
import ProgressBar from './ProgressBar';
import ToastContainer, { type ToastMessage } from './Toast';

const TransferView: React.FC = () => {
    const [mode, setMode] = useState<'server' | 'client'>('server');
    const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
    const [port, setPort] = useState(8080);
    const [ip, setIp] = useState('127.0.0.1');
    const [file, setFile] = useState('');
    const [sniff, setSniff] = useState(false);
    
    // UI State
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [transferState, setTransferState] = useState<{
        active: boolean;
        filename: string;
        current: number;
        total: number;
        status: string;
    }>({ active: false, filename: '', current: 0, total: 0, status: '' });
    
    const [isScanning, setIsScanning] = useState(false);
    const [discoveredPeers, setDiscoveredPeers] = useState<{ hostname: string; ip: string; port: number }[]>([]);
    const [showPeers, setShowPeers] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const addToast = (type: 'success' | 'error' | 'info', message: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, type, message }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Drag & Drop handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            // @ts-ignore
            if (droppedFile.path) {
                // @ts-ignore
                setFile(droppedFile.path);
                setMode('client');
                addToast('info', `File selected: ${droppedFile.name}`);
            }
        }
    };

    // Listen for Backend Events
    useEffect(() => {
        const onLog = (log: string) => {
             try {
                // Try parse JSON
                const json = JSON.parse(log);
                
                if (json.type === 'TRANSFER_UPDATE') {
                    if (json.status === 'start') {
                         setTransferState({
                             active: true,
                             filename: json.filename,
                             current: 0,
                             total: json.total || 0,
                             status: 'Starting...'
                         });
                    } else if (json.status === 'progress') {
                         setTransferState(prev => ({
                             ...prev,
                             current: json.current,
                             total: json.total,
                             status: 'Transferring...'
                         }));
                    } else if (json.status === 'complete') {
                         setTransferState(prev => ({ ...prev, active: false, current: prev.total, status: 'Completed' }));
                         addToast('success', `Transfer Complete: ${json.filename}`);
                         setIsConnected(false); // Reset connection state if needed or keep it?
                    }
                } else if (json.type === 'SERVER_READY') {
                    setIsConnected(true);
                    addToast('success', `Server started on port ${json.port}`);
                } else if (json.type === 'ERROR') {
                    addToast('error', json.message || 'Unknown Error');
                    setIsConnected(false);
                    setTransferState(prev => ({ ...prev, active: false, status: 'Error' }));
                }
                return;
             } catch (e) {
                 // Not JSON
             }
             
             // Debug Logs (Simulate connection state for legacy logs if needed)
             if (log.includes("Connected by")) setIsConnected(true);
             if (log.includes("Connection lost") || log.includes("stopping")) setIsConnected(false);
        };

        if (window.api) {
            window.api.onLog(onLog);
        }
    }, []);

    const handleStartServer = async () => {
        setTransferState(prev => ({ ...prev, status: 'Starting...' }));
        try {
            await window.api.startServer({
                port,
                protocol,
                saveDir: './received_files',
                sniff
            });
            // Success toast handled by SERVER_READY event
        } catch (error) {
            addToast('error', `Failed to start server: ${error}`);
        }
    };

    const handleSendFile = async () => {
        if (!file) {
            addToast('error', 'Please select a file first.');
            return;
        }
        setTransferState({ active: true, filename: file.split('/').pop() || 'file', current: 0, total: 0, status: 'Initializing...' });
        try {
            await window.api.sendFile({
                file,
                ip,
                port,
                protocol,
                sniff
            });
            // Success/Progress handled by events
        } catch (error) {
            addToast('error', `Failed to send: ${error}`);
            setTransferState(prev => ({ ...prev, active: false }));
        }
    };

    const handleScanNetwork = async () => {
        setIsScanning(true);
        try {
            const peers = await window.api.scanNetwork();
            setDiscoveredPeers(peers);
            setShowPeers(true);
            if(peers.length === 0) addToast('info', 'No peers found.');
        } catch (error) {
            addToast('error', 'Scan failed.');
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="space-y-6 relative" onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            
            {/* Drag Overlay */}
            {dragActive && (
                <div className="absolute inset-0 z-50 bg-blue-600/20 border-4 border-blue-500 border-dashed rounded-xl flex items-center justify-center pointer-events-none backdrop-blur-sm transition-all">
                    <div className="bg-gray-900 p-6 rounded-xl shadow-2xl border border-blue-500 text-center">
                        <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        <h3 className="text-2xl font-bold text-white">Drop File Here</h3>
                    </div>
                </div>
            )}

            <div className="bg-gray-800 p-1 rounded-lg inline-flex">
                <button
                    onClick={() => setMode('server')}
                    className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                        mode === 'server' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Receiver (Server)
                </button>
                <button
                    onClick={() => setMode('client')}
                    className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                        mode === 'client' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Transmitter (Client)
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 relative overflow-hidden">
                        {/* Connected Indicator */}
                        {isConnected && (
                            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-xs font-medium text-green-400">Connected</span>
                            </div>
                        )}

                        <h3 className="text-lg font-semibold mb-4 text-gray-200">Configuration</h3>
                        
                        <div className="space-y-4">
                            {/* Protocol & Port */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Protocol</label>
                                    <select 
                                        value={protocol} 
                                        onChange={(e) => setProtocol(e.target.value as 'tcp' | 'udp')}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="tcp">TCP (Reliable)</option>
                                        <option value="udp">UDP (Fast)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Port</label>
                                    <input 
                                        type="number" 
                                        value={port}
                                        onChange={(e) => setPort(parseInt(e.target.value))}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Client Specifics */}
                            {mode === 'client' && (
                                <>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Destination IP</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={ip}
                                                onChange={(e) => setIp(e.target.value)}
                                                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                            <button 
                                                onClick={handleScanNetwork}
                                                disabled={isScanning}
                                                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {isScanning ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"/> : "🔍"}
                                            </button>
                                        </div>
                                        {/* Peers Dropdown Logic (Simplified for brevity, can be expanded) */}
                                         {showPeers && discoveredPeers.length > 0 && (
                                            <div className="absolute z-50 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2">
                                                {discoveredPeers.map((peer, idx) => (
                                                    <button key={idx} onClick={() => { setIp(peer.ip); setPort(peer.port); setShowPeers(false); }} className="block w-full text-left text-sm text-white hover:bg-gray-700 p-2 rounded">
                                                        {peer.hostname} ({peer.ip})
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">File Path</label>
                                        <input 
                                            type="text" 
                                            value={file}
                                            onChange={(e) => setFile(e.target.value)}
                                            placeholder="Drag & Drop file here"
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-600"
                                        />
                                    </div>
                                </>
                            )}
                            
                            {/* Sniffer Toggle */}
                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={sniff} 
                                        onChange={(e) => setSniff(e.target.checked)}
                                        className="rounded bg-gray-900 border-gray-700 text-blue-500 focus:ring-blue-500"
                                    />
                                    <span className="text-gray-300">Enable Packet Sniffer</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={mode === 'server' ? handleStartServer : handleSendFile}
                        disabled={transferState.active && mode === 'client'}
                        className={`w-full font-bold py-4 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] ${
                            mode === 'server' 
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {mode === 'server' ? (isConnected && !import.meta.env.TEST ? 'Server Running' : 'Start Server') : 'Send File'}
                    </button>

                    {/* Transfer Status Panel */}
                    {(transferState.active || transferState.status) && (
                        <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
                             <h4 className="text-sm font-medium text-gray-400 mb-2">Transfer Status</h4>
                             <div className="flex justify-between items-center mb-2">
                                 <span className="text-white font-medium">{transferState.filename || (mode === 'server' ? 'Waiting for file...' : 'Ready')}</span>
                                 <span className="text-xs text-gray-400">{transferState.status}</span>
                             </div>
                             {transferState.total > 0 && (
                                 <ProgressBar 
                                     progress={(transferState.current / transferState.total) * 100} 
                                     color={mode === 'server' ? 'emerald' : 'blue'} 
                                 />
                             )}
                        </div>
                    )}
                </div>

                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full flex flex-col">
                    <SlidingWindow />
                </div>
            </div>
        </div>
    );
};

export default TransferView;
