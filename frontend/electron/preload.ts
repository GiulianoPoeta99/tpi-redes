import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('api', {
  startServer: (config: unknown) => ipcRenderer.invoke('start-server', config),
  sendFiles: (config: unknown) => ipcRenderer.invoke('send-files', config),
  onLog: (callback: (log: string) => void) => {
    const subscription = (_event: unknown, value: unknown) => callback(String(value));
    ipcRenderer.on('python-log', subscription);
    return () => ipcRenderer.removeListener('python-log', subscription);
  },
  onWindowUpdate: (callback: (data: unknown) => void) => {
    const subscription = (_event: unknown, value: unknown) => callback(value);
    ipcRenderer.on('window-update', subscription);
    return () => ipcRenderer.removeListener('window-update', subscription);
  },
  onStatsUpdate: (callback: (data: unknown) => void) => {
    const subscription = (_event: unknown, value: unknown) => callback(value);
    ipcRenderer.on('stats-update', subscription);
    return () => ipcRenderer.removeListener('stats-update', subscription);
  },
  startProxy: (config: unknown) => ipcRenderer.invoke('start-proxy', config),
  scanNetwork: () => ipcRenderer.invoke('scan-network'),
  stopProcess: () => ipcRenderer.invoke('stop-process'),
  getLocalIp: () => ipcRenderer.invoke('get-local-ip'),
  onPacketCapture: (callback: (data: unknown) => void) => {
    const subscription = (_event: unknown, value: unknown) => callback(value);
    ipcRenderer.on('packet-capture', subscription);
    return () => ipcRenderer.removeListener('packet-capture', subscription);
  },
  onSnifferError: (callback: (data: unknown) => void) => {
    const subscription = (_event: unknown, value: unknown) => callback(value);
    ipcRenderer.on('sniffer-error', subscription);
    return () => ipcRenderer.removeListener('sniffer-error', subscription);
  },
  onProcessExit: (callback: (data: { code: number; signal: string }) => void) => {
    const subscription = (_event: unknown, value: unknown) =>
      callback(value as { code: number; signal: string });
    ipcRenderer.on('process-exit', subscription);
    return () => ipcRenderer.removeListener('process-exit', subscription);
  },
  getFilePath: (file: File) => webUtils.getPathForFile(file),
  // File System
  getDownloadsDir: () => ipcRenderer.invoke('get-downloads-dir'),
  listFiles: (path: string) => ipcRenderer.invoke('list-files', path),
  openPath: (path: string) => ipcRenderer.invoke('open-path', path),
  openFolder: (path: string) => ipcRenderer.invoke('open-folder', path),
  verifyFile: (path: string) => ipcRenderer.invoke('verify-file', path),
  getInterfaces: () => ipcRenderer.invoke('get-interfaces'),
});
