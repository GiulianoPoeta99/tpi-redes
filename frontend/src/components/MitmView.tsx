import React, { useState } from 'react';

const MitmView: React.FC = () => {
    const [listenPort, setListenPort] = useState(8081);
    const [targetIp, setTargetIp] = useState('127.0.0.1');
    const [targetPort, setTargetPort] = useState(8080);
    const [corruptionRate, setCorruptionRate] = useState(0.01);
    const [status, setStatus] = useState('');

    const handleStartProxy = async () => {
        setStatus('Starting proxy...');
        try {
            const result = await window.api.startProxy({
                listenPort,
                targetIp,
                targetPort,
                corruptionRate
            });
            setStatus(result);
        } catch (error) {
            setStatus(`Error: ${error}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-red-900/50 shadow-lg shadow-red-900/20">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <h3 className="text-xl font-semibold text-red-400">MITM Attack Configuration</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Listen Port (Proxy)</label>
                            <input 
                                type="number" 
                                value={listenPort}
                                onChange={(e) => setListenPort(parseInt(e.target.value))}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-red-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Target IP</label>
                            <input 
                                type="text" 
                                value={targetIp}
                                onChange={(e) => setTargetIp(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-red-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Target Port</label>
                            <input 
                                type="number" 
                                value={targetPort}
                                onChange={(e) => setTargetPort(parseInt(e.target.value))}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-red-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">
                                Corruption Rate: <span className="text-red-400 font-bold">{(corruptionRate * 100).toFixed(1)}%</span>
                            </label>
                            <input 
                                type="range" 
                                min="0" 
                                max="0.5" 
                                step="0.005"
                                value={corruptionRate}
                                onChange={(e) => setCorruptionRate(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Probability of flipping a bit in each packet.</p>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleStartProxy}
                                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-4 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Start Attack Proxy
                            </button>
                        </div>

                        {status && (
                            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 text-sm text-gray-300">
                                Status: <span className="text-white font-medium">{status}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h4 className="text-lg font-semibold text-gray-300 mb-4">Attack Logs</h4>
                <div className="h-48 bg-gray-950 rounded-lg border border-gray-800 p-4 font-mono text-xs text-gray-400 overflow-y-auto">
                    <p className="italic text-gray-600">Proxy logs will appear here...</p>
                </div>
            </div>
        </div>
    );
};

export default MitmView;
