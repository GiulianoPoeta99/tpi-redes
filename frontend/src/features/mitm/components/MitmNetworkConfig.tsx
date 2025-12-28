import { Network } from 'lucide-react';
import type React from 'react';
import ConfigGroup from '../../shared/components/ConfigGroup';
import MitmProxyConfig from './MitmProxyConfig';
import MitmTargetConfig from './MitmTargetConfig';

/**
 * Configuration for MITM network settings.
 */
interface MitmConfig {
  listenPort: number | string;
  targetIp: string;
  targetPort: number | string;
  corruption: number;
}

/**
 * Props for MitmNetworkConfig.
 */
interface MitmNetworkConfigProps {
  /**
   * Current MITM network configuration.
   */
  config: MitmConfig;
  /**
   * Callback to update configuration.
   */
  setConfig: (config: MitmConfig) => void;
  /**
   * Whether the MITM proxy is currently running.
   */
  isRunning: boolean;
  /**
   * Whether an attack (corruption) is active.
   */
  isAttacking: boolean;
  /**
   * Callback to open the network scan modal.
   */
  openScan: () => void;
}

/**
 * Visualization and configuration of the MITM network flow.
 * Shows the proxy listener, the packet flow animation, and the target configuration.
 */
const MitmNetworkConfig: React.FC<MitmNetworkConfigProps> = ({
  config,
  setConfig,
  isRunning,
  isAttacking,
  openScan,
}) => {
  return (
    <ConfigGroup title="Network Configuration" icon={Network}>
      <div className="flex items-start gap-4">
        <div className="w-64 shrink-0">
          <MitmProxyConfig
            listenPort={config.listenPort}
            onChange={(val) => setConfig({ ...config, listenPort: val })}
            disabled={isRunning}
          />
        </div>

        <div className="flex-1 flex flex-col justify-center px-4 relative h-full pt-8 group">
          <style>
            {`
              @keyframes flow-animation {
                to {
                  stroke-dashoffset: -20;
                }
              }
              .flow-active {
                animation: flow-animation 0.5s linear infinite;
              }
              .flow-attacking {
                animation: flow-animation 0.2s linear infinite;
              }
            `}
          </style>

          <div className="relative w-full h-8 flex items-center">
            <div
              className={`w-2 h-2 rounded-full ${
                isRunning
                  ? isAttacking
                    ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                    : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                  : 'bg-gray-700'
              } absolute left-0 z-10`}
            ></div>
            <div
              className={`w-2 h-2 rounded-full ${
                isRunning
                  ? isAttacking
                    ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                    : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                  : 'bg-gray-700'
              } absolute right-0 z-10`}
            ></div>

            <svg
              className="w-full h-full overflow-visible"
              aria-label="Packet Flow Visualization"
              role="img"
            >
              <title>Packet Flow</title>
              <line
                x1="0"
                y1="50%"
                x2="100%"
                y2="50%"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="10 10"
                className={`transition-colors duration-300 ${
                  isRunning
                    ? isAttacking
                      ? 'text-red-500 flow-attacking opacity-100'
                      : 'text-green-500 flow-active opacity-80'
                    : 'text-gray-700 opacity-30'
                }`}
              />
            </svg>

            {isRunning && (
              <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-[10px] font-mono font-bold tracking-widest px-2 rounded border bg-gray-900/80 ${
                  isAttacking
                    ? 'text-red-500 border-red-500/20'
                    : 'text-green-500 border-green-500/20'
                }`}
              >
                {isAttacking ? 'ATTACKING' : 'INTERCEPTING'}
              </div>
            )}
          </div>
        </div>

        <div className="w-96 shrink-0">
          <MitmTargetConfig
            targetIp={config.targetIp}
            targetPort={config.targetPort}
            onIpChange={(val) => setConfig({ ...config, targetIp: val })}
            onPortChange={(val) => setConfig({ ...config, targetPort: val })}
            onScanClick={openScan}
            disabled={isRunning}
          />
        </div>
      </div>
    </ConfigGroup>
  );
};

export default MitmNetworkConfig;
