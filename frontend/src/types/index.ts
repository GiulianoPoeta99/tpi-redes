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
  window: number;
  mode?: 'receiver' | 'transmitter' | 'mitm';
}
