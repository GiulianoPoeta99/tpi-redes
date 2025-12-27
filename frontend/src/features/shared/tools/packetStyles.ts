import type { Packet } from '../types';

export const getPacketRowClass = (pkt: Packet) => {
  // Protocol/Flag based Highlights
  if (pkt.protocol === 'TCP') {
    if (pkt.flags.includes('S')) return 'bg-green-900/20 text-green-100 hover:bg-green-900/30';
    if (pkt.flags.includes('F')) return 'bg-red-900/20 text-red-100 hover:bg-red-900/30';
    if (pkt.flags.includes('R')) return 'bg-yellow-900/20 text-yellow-100 hover:bg-yellow-900/30';
  }

  // Default Mode Styling
  switch (pkt.mode) {
    case 'receiver':
      return 'bg-purple-900/20 hover:bg-purple-900/30 text-gray-300';
    case 'transmitter':
      return 'bg-blue-900/20 hover:bg-blue-900/30 text-gray-300';
    case 'mitm':
      return 'bg-red-900/20 hover:bg-red-900/30 text-gray-300';
    default:
      return 'hover:bg-gray-800/50 transition-colors';
  }
};
