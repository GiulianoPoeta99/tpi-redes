/// <reference types="vite/client" />

interface Window {
  api: {
    // biome-ignore lint/suspicious/noExplicitAny: API signature
    startServer: (args: any) => Promise<any>;
    // biome-ignore lint/suspicious/noExplicitAny: API signature
    sendFiles: (args: any) => Promise<any>;
    // biome-ignore lint/suspicious/noExplicitAny: API signature
    scanNetwork: () => Promise<any[]>;
    stopProcess: () => Promise<boolean>;
    getFilePath: (file: File) => string;
    onLog: (callback: (log: string) => void) => () => void;
    // biome-ignore lint/suspicious/noExplicitAny: API signature
    onWindowUpdate: (callback: (data: any) => void) => () => void;
    // biome-ignore lint/suspicious/noExplicitAny: API signature
    onStatsUpdate: (callback: (data: any) => void) => () => void;
    // biome-ignore lint/suspicious/noExplicitAny: API signature
    startProxy: (args: any) => Promise<any>;
    // biome-ignore lint/suspicious/noExplicitAny: API signature
    onPacketCapture: (callback: (data: any) => void) => () => void;
    getLocalIp: () => Promise<string>;
  };
}
