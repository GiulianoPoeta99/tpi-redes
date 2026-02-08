import { FileText } from 'lucide-react';
import type React from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import BaseModal from '../../shared/components/BaseModal';
import { getPacketRowClass } from '../../shared/tools/packetStyles';
import type { Packet } from '../../shared/types';

/**
 * Props for ExpandedPacketModal.
 */
interface ExpandedPacketModalProps {
  isOpen: boolean;
  onClose: () => void;
  packets: Packet[];
}

/**
 * Modal to view the full list of captured packets in a detailed table.
 * Uses virtualization for high performance with large datasets.
 */
const ExpandedPacketModal: React.FC<ExpandedPacketModalProps> = ({ isOpen, onClose, packets }) => {
  const formatTime = (ts: number) => {
    const date = new Date(ts * 1000);
    return (
      date.toLocaleTimeString('en-US', { hour12: false }) +
      '.' +
      date.getMilliseconds().toString().padStart(3, '0')
    );
  };

  const getProtocolClass = (proto: string) => {
    if (proto === 'TCP') return 'text-cyan-500 font-bold';
    if (proto === 'UDP') return 'text-orange-500 font-bold';
    return 'text-gray-300';
  };

  const separateIpPort = (addr: string) => {
    const parts = addr.split(':');
    if (parts.length === 2) return { ip: parts[0], port: parts[1] };
    return { ip: addr, port: '' };
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Packet Inspection"
      description="Detailed packet capture log"
      icon={FileText}
      size="full"
    >
      <div className="h-full flex flex-col bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700">
        <TableVirtuoso
          data={packets}
          followOutput={'auto'}
          fixedHeaderContent={() => (
            <tr className="bg-gray-800 text-xs uppercase tracking-wider font-bold text-gray-400 text-left">
              <th className="p-3 w-16 border-b border-gray-700 bg-gray-800">No.</th>
              <th className="p-3 w-28 border-b border-gray-700 bg-gray-800">Time</th>
              <th className="p-3 w-32 border-b border-gray-700 bg-gray-800">Source IP</th>
              <th className="p-3 w-20 border-b border-gray-700 bg-gray-800">Port</th>
              <th className="p-3 w-32 border-b border-gray-700 bg-gray-800">Dest IP</th>
              <th className="p-3 w-20 border-b border-gray-700 bg-gray-800">Port</th>
              <th className="p-3 w-16 border-b border-gray-700 bg-gray-800">Proto</th>
              <th className="p-3 w-24 border-b border-gray-700 bg-gray-800">Flags</th>
              <th className="p-3 w-20 border-b border-gray-700 bg-gray-800">Seq</th>
              <th className="p-3 w-20 border-b border-gray-700 bg-gray-800">Ack</th>
              <th className="p-3 w-20 border-b border-gray-700 bg-gray-800">Win</th>
              <th className="p-3 w-16 border-b border-gray-700 bg-gray-800">Len</th>
              <th className="p-3 border-b border-gray-700 bg-gray-800">Info / Payload</th>
            </tr>
          )}
          itemContent={(index, pkt) => {
            const src = separateIpPort(pkt.src);
            const dst = separateIpPort(pkt.dst);
            return (
              <>
                <td className="p-2 px-3 text-gray-500 font-mono text-xs border-b border-gray-800/50">
                  {index + 1}
                </td>
                <td className="p-2 px-3 text-gray-400 font-mono text-xs border-b border-gray-800/50">
                  {formatTime(pkt.timestamp)}
                </td>
                <td className="p-2 px-3 font-mono text-xs border-b border-gray-800/50 text-blue-300">
                  {src.ip}
                </td>
                <td className="p-2 px-3 text-gray-400 font-mono text-xs border-b border-gray-800/50">
                  {src.port}
                </td>
                <td className="p-2 px-3 font-mono text-xs border-b border-gray-800/50 text-purple-300">
                  {dst.ip}
                </td>
                <td className="p-2 px-3 text-gray-400 font-mono text-xs border-b border-gray-800/50">
                  {dst.port}
                </td>
                <td
                  className={`p-2 px-3 font-mono text-xs border-b border-gray-800/50 ${getProtocolClass(pkt.protocol)}`}
                >
                  {pkt.protocol}
                </td>
                <td className="p-2 px-3 font-mono text-xs border-b border-gray-800/50">
                  {pkt.flags ? (
                    <span className="bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-[10px]">
                      {pkt.flags}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="p-2 px-3 text-gray-400 font-mono text-xs border-b border-gray-800/50">
                  {pkt.seq}
                </td>
                <td className="p-2 px-3 text-gray-400 font-mono text-xs border-b border-gray-800/50">
                  {pkt.ack}
                </td>
                <td className="p-2 px-3 text-gray-400 font-mono text-xs border-b border-gray-800/50">
                  {pkt.window}
                </td>
                <td className="p-2 px-3 text-gray-400 font-mono text-xs border-b border-gray-800/50">
                  {pkt.length}
                </td>
                <td
                  className="p-2 px-3 text-gray-500 font-mono text-xs border-b border-gray-800/50 truncate max-w-xs"
                  title={pkt.info}
                >
                  {pkt.info}
                </td>
              </>
            );
          }}
          components={{
            Table: (props) => <table {...props} className="w-full border-collapse table-fixed" />,
            TableRow: (props: React.ComponentPropsWithoutRef<'tr'> & { item: Packet }) => (
              <tr
                {...props}
                className={`${props.className || ''} ${getPacketRowClass(props.item as Packet)}`}
              />
            ),
          }}
        />
      </div>
    </BaseModal>
  );
};

export default ExpandedPacketModal;
