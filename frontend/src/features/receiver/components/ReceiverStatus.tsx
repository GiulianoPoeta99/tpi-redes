import { Activity, Power } from 'lucide-react';
import type React from 'react';
import FileListItem from '../../shared/components/FileListItem';
import SlidingWindow from './SlidingWindow';

/**
 * Props for the ReceiverStatus component.
 *
 * @property isConnected - Whether the server is running.
 * @property transferActive - Whether a file transfer is currently active.
 * @property localIp - Local IP address.
 * @property port - Local port.
 * @property protocol - Active protocol.
 * @property lastFile - Name of the last received file.
 */
interface ReceiverStatusProps {
  isConnected: boolean;
  transferActive: boolean;
  localIp: string;
  port: number | string;
  protocol: 'tcp' | 'udp';
  lastFile: string | null;
}

/**
 * Displays the current status of the receiver (server), including online/offline state,
 * listening details, and visual feedback during data reception.
 */
const ReceiverStatus: React.FC<ReceiverStatusProps> = ({
  isConnected,
  transferActive,
  localIp,
  port,
  protocol,
  lastFile,
}) => {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-64 bg-gray-900/50 rounded-2xl border border-gray-700/50 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
        {!isConnected ? (
          <div className="text-center group">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gray-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
              <div className="bg-gray-800/50 p-6 rounded-full mb-6 border border-white/5 group-hover:border-white/10 transition-colors hover:shadow-lg hover:shadow-gray-900/40">
                <Power
                  className="text-gray-500 group-hover:text-gray-400 transition-colors"
                  size={48}
                />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-300 mb-2">Server is Offline</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Configure settings and click Start to listen.
            </p>
          </div>
        ) : transferActive ? (
          <div className="w-full h-full p-4 relative">
            <SlidingWindow />
            <div className="absolute bottom-4 left-0 right-0 text-center text-green-400 animate-pulse font-mono text-sm bg-black/50 py-1 backdrop-blur-md border-y border-green-500/20">
              RECEIVING DATA STREAM...
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-green-500/20 blur-2xl animate-pulse rounded-full" />
              <Activity
                size={64}
                className="text-green-500 relative z-10 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]"
              />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Ready to Receive</h3>
            <p className="text-gray-400 max-w-sm mx-auto">
              Server is listening on{' '}
              <span className="text-green-400 font-mono font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                {localIp}:{port}
              </span>{' '}
              <span className="text-xs ml-1 text-gray-500">({protocol.toUpperCase()})</span>
            </p>

            {lastFile && (
              <FileListItem
                filename={lastFile}
                status="success"
                className="mt-8 max-w-sm mx-auto border-green-500/20 bg-green-500/5 hover:bg-green-500/10"
                iconClassName="bg-green-500/20 text-green-400"
                details={
                  <span className="text-[10px] uppercase font-bold text-green-500/50">
                    Last Received
                  </span>
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiverStatus;
