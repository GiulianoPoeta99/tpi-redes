export {};

declare global {
  interface Window {
    api: {
      startServer: (config: { port: number; protocol: string; saveDir: string; sniff: boolean }) => Promise<string>;
      sendFile: (config: { file: string; ip: string; port: number; protocol: string; sniff: boolean }) => Promise<string>;
      onLog: (callback: (log: string) => void) => void;
      onWindowUpdate: (callback: (data: { type: string; base: number; next_seq: number; window_size: number; total: number }) => void) => void;
      onStatsUpdate: (callback: (data: { type: string; rtt: number; throughput: number; progress: number }) => void) => void;
      startProxy: (config: { listenPort: number; targetIp: string; targetPort: number; corruptionRate: number }) => Promise<string>;
      scanNetwork: () => Promise<{ hostname: string; ip: string; port: number }[]>;
      onPacketCapture: (callback: (data: {
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
      }) => void) => void;
    };
  }
}
