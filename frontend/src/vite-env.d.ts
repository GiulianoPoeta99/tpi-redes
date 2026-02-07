/// <reference types="vite/client" />

interface Window {
  api: {
    startServer: (args: {
      port: number;
      protocol: 'tcp' | 'udp';
      saveDir?: string;
      sniff: boolean;
      interface: string | null;
    }) => Promise<void>;
    sendFiles: (args: {
      files: string[];
      ip: string;
      port: number;
      protocol: 'tcp' | 'udp';
      sniff: boolean;
      delay: number;
      chunkSize: number;
      interface: string | null;
    }) => Promise<void>;
    scanNetwork: () => Promise<{ ip: string; port?: number; hostname?: string }[]>;
    stopProcess: () => Promise<boolean>;
    getFilePath: (file: File) => string;
    onLog: (callback: (log: string) => void) => () => void;
    onWindowUpdate: (callback: (data: unknown) => void) => () => void;
    onStatsUpdate: (callback: (data: unknown) => void) => () => void;
    startProxy: (args: {
      listenPort: number;
      targetIp: string;
      targetPort: number;
      corruptionRate: number;
      interfaceName?: string;
      protocol: string;
    }) => Promise<void>;
    onPacketCapture: (callback: (data: unknown) => void) => () => void;
    onSnifferError: (callback: (data: unknown) => void) => () => void;
    onProcessExit: (callback: (data: { code: number; signal: string }) => void) => () => void;
    getLocalIp: () => Promise<string>;
    getDownloadsDir: () => Promise<string>;
    listFiles: (
      path: string,
    ) => Promise<{ name: string; size: number; mtime: number; path: string }[]>;
    openPath: (path: string) => Promise<void>;
    openFolder: (path: string) => Promise<void>;
    verifyFile: (
      path: string,
    ) => Promise<{ valid: boolean; error?: string; actual?: string; expected?: string }>;
    getInterfaces: () => Promise<string[]>;
  };
}
