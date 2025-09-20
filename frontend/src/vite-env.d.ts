/// <reference types="vite/client" />

interface Window {
  api: {
    startServer: (args: any) => Promise<any>;
    sendFile: (args: any) => Promise<any>;
    startProxy: (args: any) => Promise<any>;
    scanNetwork: () => Promise<any[]>;
    stopProcess: () => Promise<boolean>;
    onLog: (callback: (log: string) => void) => void;
    onWindowUpdate: (callback: (data: any) => void) => void;
    onStatsUpdate: (callback: (data: any) => void) => void;
  }
}
