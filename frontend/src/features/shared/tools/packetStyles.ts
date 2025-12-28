import type { Packet } from '../types';

/**
 * Determines the CSS class for a packet row based on its protocol, flags, and mode.
 *
 * @param pkt - The packet object.
 * @returns Tailwind CSS class string.
 */
export const getPacketRowClass = (pkt: Packet) => {
  if (pkt.protocol === 'TCP') {
    if (pkt.flags.includes('S')) return 'bg-green-900/20 text-green-100 hover:bg-green-900/30';
    if (pkt.flags.includes('F')) return 'bg-red-900/20 text-red-100 hover:bg-red-900/30';
    if (pkt.flags.includes('R')) return 'bg-yellow-900/20 text-yellow-100 hover:bg-yellow-900/30';
  }

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
