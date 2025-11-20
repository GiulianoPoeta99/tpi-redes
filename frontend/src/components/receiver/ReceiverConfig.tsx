import { Power, Settings } from 'lucide-react';
import type React from 'react';
import GlassCard from '../common/GlassCard';
import InputGroup from '../common/InputGroup';
import ProtocolToggle from '../common/ProtocolToggle';

interface ReceiverConfigProps {
  localIp: string;
  port: number;
  setPort: (port: number) => void;
  protocol: 'tcp' | 'udp';
  setProtocol: (protocol: 'tcp' | 'udp') => void;
  isConnected: boolean;
  toggleServer: () => void;
}

const ReceiverConfig: React.FC<ReceiverConfigProps> = ({
  localIp,
  port,
  setPort,
  protocol,
  setProtocol,
  isConnected,
  toggleServer,
}) => {
  return (
    <GlassCard title="Listener Config" icon={Settings} className="flex-1">
      <div className="space-y-6 flex flex-col h-full">
        {/* IP Display (ReadOnly) */}
        <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
          <span className="text-xs font-bold text-blue-400 uppercase block mb-1">
            My IP Address
          </span>
          <span className="text-xl font-mono text-white tracking-wider flex items-center gap-2">
            {localIp}
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </span>
        </div>

        <InputGroup label="Port & Protocol">
          <div className="flex-1">
            <span className="text-xs text-gray-400 block mb-1">Port</span>
            <input
              type="number"
              disabled={isConnected}
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <ProtocolToggle protocol={protocol} onChange={setProtocol} disabled={isConnected} />
        </InputGroup>

        <div className="flex-1"></div>

        <button
          type="button"
          onClick={toggleServer}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 ${
            isConnected
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'
              : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20'
          }`}
        >
          <Power size={20} />
          {isConnected ? 'STOP SERVER' : 'START SERVER'}
        </button>
      </div>
    </GlassCard>
  );
};

export default ReceiverConfig;
