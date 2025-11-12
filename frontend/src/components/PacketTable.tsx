import type React from 'react';
import { TableVirtuoso } from 'react-virtuoso';

export interface Packet {
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

interface PacketTableProps {
  packets: Packet[];
}

const PacketTable: React.FC<PacketTableProps> = ({ packets }) => {
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
      <div className="flex-1 overflow-hidden bg-gray-900/50">
        <TableVirtuoso
          data={packets}
          followOutput={'auto'}
          fixedHeaderContent={() => (
            <tr className="bg-gray-800 text-gray-400 text-left">
              <th className="p-2 w-12 border-b border-gray-700 bg-gray-800">No.</th>
              <th className="p-2 w-24 border-b border-gray-700 bg-gray-800">Time</th>
              <th className="p-2 w-48 border-b border-gray-700 bg-gray-800">Source</th>
              <th className="p-2 w-48 border-b border-gray-700 bg-gray-800">Destination</th>
              <th className="p-2 w-16 border-b border-gray-700 bg-gray-800">Proto</th>
              <th className="p-2 w-16 border-b border-gray-700 bg-gray-800">Len</th>
              <th className="p-2 border-b border-gray-700 bg-gray-800">Info</th>
            </tr>
          )}
          itemContent={(index, pkt) => (
            <>
              <td className="p-1 px-2 text-gray-500">{index + 1}</td>
              <td className="p-1 px-2 text-gray-400">{formatTime(pkt.timestamp)}</td>
              <td className="p-1 px-2 text-blue-300 truncate" title={pkt.src}>
                {pkt.src}
              </td>
              <td className="p-1 px-2 text-purple-300 truncate" title={pkt.dst}>
                {pkt.dst}
              </td>
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
