import React, { useState } from 'react';
import SlidingWindow from './SlidingWindow';

const TransferView: React.FC = () => {
    const [mode, setMode] = useState<'server' | 'client'>('server');
    const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
    const [port, setPort] = useState(8080);
    const [ip, setIp] = useState('127.0.0.1');
    const [file, setFile] = useState('');
    const [sniff, setSniff] = useState(false);
    const [status, setStatus] = useState('');

    const handleStartServer = async () => {
        setStatus('Starting server...');
        try {
            const result = await window.api.startServer({
                port,
                protocol,
                saveDir: './received_files',
                sniff
            });
            setStatus(result);
        } catch (error) {
            setStatus(`Error: ${error}`);
        }
    };

    const handleSendFile = async () => {
        if (!file) {
            setStatus('Please select a file.');
            return;
        }
        setStatus('Sending file...');
        try {
            const result = await window.api.sendFile({
                file,
                ip,
                port,
                protocol,
                sniff
            });
            setStatus(result);
        } catch (error) {
            setStatus(`Error: ${error}`);
        }
    };

    return (
        <div className="space-y-6">
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
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 text-gray-200">Configuration</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Protocol</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            checked={protocol === 'tcp'} 
                                            onChange={() => setProtocol('tcp')}
                                            className="text-blue-500 focus:ring-blue-500"
                                        />
                                        <span className="text-gray-300">TCP (Reliable)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            checked={protocol === 'udp'} 
                                            onChange={() => setProtocol('udp')}
                                            className="text-blue-500 focus:ring-blue-500"
                                        />
                                        <span className="text-gray-300">UDP (Fast)</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Port</label>
                                <input 
                                    type="number" 
                                    value={port}
                                    onChange={(e) => setPort(parseInt(e.target.value))}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {mode === 'client' && (
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Destination IP</label>
                                    <input 
                                        type="text" 
                                        value={ip}
                                        onChange={(e) => setIp(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            )}

                            {mode === 'client' && (
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">File Path</label>
                                    <input 
                                        type="text" 
                                        value={file}
                                        onChange={(e) => setFile(e.target.value)}
                                        placeholder="/path/to/file"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            )}

                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={sniff} 
                                        onChange={(e) => setSniff(e.target.checked)}
                                        className="rounded bg-gray-900 border-gray-700 text-blue-500 focus:ring-blue-500"
                                    />
                                    <span className="text-gray-300">Enable Packet Sniffer (Requires Root)</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={mode === 'server' ? handleStartServer : handleSendFile}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {mode === 'server' ? 'Start Server' : 'Send File'}
                    </button>

                    {status && (
                        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 text-sm text-gray-300">
                            Status: <span className="text-white font-medium">{status}</span>
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
