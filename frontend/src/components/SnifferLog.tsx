import React, { useEffect, useState, useRef } from 'react';

const SnifferLog: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Subscribe to logs
        window.api.onLog((log) => {
            setLogs((prev) => [...prev, log]);
        });
    }, []);

    useEffect(() => {
        // Auto-scroll to bottom
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="flex flex-col h-full bg-gray-950 rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
            <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex justify-between items-center">
                <h2 className="text-sm font-mono text-gray-400">Terminal Output</h2>
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1">
                {logs.length === 0 && (
                    <div className="text-gray-600 italic">Waiting for activity...</div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className={`${getLogColor(log)} break-all`}>
                        {log}
                    </div>
                ))}
                <div ref={logEndRef} />
            </div>
        </div>
    );
};

function getLogColor(log: string): string {
    if (log.includes("ERROR")) return "text-red-400";
    if (log.includes("SNIFFER")) return "text-cyan-400";
    if (log.includes("WARNING")) return "text-yellow-400";
    if (log.includes("Starting")) return "text-green-400";
    return "text-gray-300";
}

export default SnifferLog;
