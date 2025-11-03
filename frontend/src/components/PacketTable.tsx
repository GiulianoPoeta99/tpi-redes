import type React from 'react';
import { useEffect, useState } from 'react';
import { TableVirtuoso } from 'react-virtuoso';

interface Packet {
  type: string;
  timestamp: number;
  src: string;
  dst: string;
  protocol: string;
  length: number;
  info: string;
  flags: string;
  seq: number;
  ack: number;
}

const PacketTable: React.FC = () => {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    window.api.onPacketCapture((packet) => {
      if (!paused) {
        setPackets((prev) => [...prev, packet]);
      }
    });
  }, [paused]);

  const getRowClass = (pkt: Packet) => {
    if (pkt.protocol === 'TCP') {
      if (pkt.flags.includes('S')) return 'bg-green-900/30 text-green-200'; // SYN
      if (pkt.flags.includes('F')) return 'bg-red-900/30 text-red-200'; // FIN
      if (pkt.flags.includes('R')) return 'bg-yellow-900/30 text-yellow-200'; // RST
    }
    return 'hover:bg-gray-800';
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts * 1000);
    return (
      date.toLocaleTimeString('en-US', { hour12: false }) +
      '.' +
      date.getMilliseconds().toString().padStart(3, '0')
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden text-xs font-mono">
      <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700">
        <span className="font-semibold text-gray-300">Packet Capture</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPackets([])}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title="Clear"
          >
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setPaused(!paused)}
            className={`p-1 rounded ${paused ? 'bg-red-900/50 text-red-200' : 'hover:bg-gray-700 text-gray-400 hover:text-white'}`}
            title={paused ? 'Resume Auto-Scroll' : 'Pause Auto-Scroll'}
          >
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-gray-900/50">
        <TableVirtuoso
          data={packets}
          followOutput={paused ? false : 'auto'}
          fixedHeaderContent={() => (
            <tr className="bg-gray-800 text-gray-400 text-left">
              <th className="p-2 w-12 border-b border-gray-700 bg-gray-800">No.</th>
              <th className="p-2 w-24 border-b border-gray-700 bg-gray-800">Time</th>
              <th className="p-2 w-32 border-b border-gray-700 bg-gray-800">Source</th>
              <th className="p-2 w-32 border-b border-gray-700 bg-gray-800">Destination</th>
              <th className="p-2 w-16 border-b border-gray-700 bg-gray-800">Proto</th>
              <th className="p-2 w-16 border-b border-gray-700 bg-gray-800">Len</th>
              <th className="p-2 border-b border-gray-700 bg-gray-800">Info</th>
            </tr>
          )}
          itemContent={(index, pkt) => (
            <>
              <td className="p-1 px-2 text-gray-500">{index + 1}</td>
              <td className="p-1 px-2 text-gray-400">{formatTime(pkt.timestamp)}</td>
              <td className="p-1 px-2 text-blue-300">{pkt.src}</td>
              <td className="p-1 px-2 text-purple-300">{pkt.dst}</td>
              <td className="p-1 px-2 font-bold text-gray-300">{pkt.protocol}</td>
              <td className="p-1 px-2 text-gray-400">{pkt.length}</td>
              <td className="p-1 px-2 text-gray-300 truncate max-w-md" title={pkt.info}>
                {pkt.info}
              </td>
            </>
          )}
          components={{
            // biome-ignore lint/suspicious/noExplicitAny: Virtuoso types are complex
            TableRow: (props: any) => {
              const item = props?.item;
              const className = item
                ? `${getRowClass(item)} transition-colors`
                : 'hover:bg-gray-800';
              return <tr {...props} className={className} />;
            },
            Table: (props) => (
              <table
                {...props}
                style={{
                  ...props.style,
                  width: '100%',
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed',
                }}
              />
            ),
          }}
        />
      </div>
    </div>
  );
};

export default PacketTable;
