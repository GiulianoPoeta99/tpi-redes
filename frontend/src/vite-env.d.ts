/// <reference types="vite/client" />

interface Window {
  api: {
    startServer: (args: any) => Promise<any>;
    sendFiles: (args: any) => Promise<any>;
    scanNetwork: () => Promise<any[]>;
    stopProcess: () => Promise<boolean>;
    getFilePath: (file: File) => string;
    onLog: (callback: (log: string) => void) => () => void;
    onWindowUpdate: (callback: (data: any) => void) => () => void;
    onStatsUpdate: (callback: (data: any) => void) => () => void;
    startProxy: (args: any) => Promise<any>;
    onPacketCapture: (callback: (data: any) => void) => () => void;
    getLocalIp: () => Promise<string>;
  };
}
