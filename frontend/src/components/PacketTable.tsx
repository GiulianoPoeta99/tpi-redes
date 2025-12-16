import type React from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import type { Packet } from '../types';
import { getPacketRowClass } from '../utils/packetStyles';

interface PacketTableProps {
  packets: Packet[];
}

const PacketTable: React.FC<PacketTableProps> = ({ packets }) => {

  const getProtocolClass = (proto: string) => {
    if (proto === 'TCP') return 'text-proto-tcp';
    if (proto === 'UDP') return 'text-proto-udp';
    return 'text-gray-300';
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
              <th className="p-2 w-20 border-b border-gray-700 bg-gray-800">Proto</th>
              <th className="p-2 border-b border-gray-700 bg-gray-800">Len</th>
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
              <td className={`p-1 px-2 font-bold ${getProtocolClass(pkt.protocol)}`}>
                {pkt.protocol}
              </td>
              <td className="p-1 px-2 text-gray-400">{pkt.length}</td>
            </>
          )}
          components={{
            Table: (props) => <table {...props} className="w-full border-collapse" style={{ tableLayout: 'fixed' }} />,
            // biome-ignore lint/suspicious/noExplicitAny: Virtuoso types are complex
            TableRow: (props: any) => <tr {...props} className={`${props.className || ''} ${getPacketRowClass(props.item as Packet)}`} />
          }}
        />
      </div>
    </div>
  );
};

export default PacketTable;
