import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // biome-ignore lint/suspicious/noExplicitAny: Generic config
  startServer: (config: any) => ipcRenderer.invoke('start-server', config),
  // biome-ignore lint/suspicious/noExplicitAny: Generic config
  sendFiles: (config: any) => ipcRenderer.invoke('send-files', config),
  onLog: (callback: (log: string) => void) => {
    // biome-ignore lint/suspicious/noExplicitAny: IPC listener
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('python-log', subscription);
    return () => ipcRenderer.removeListener('python-log', subscription);
  },
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic update data
  onWindowUpdate: (callback: (data: any) => void) => {
    // biome-ignore lint/suspicious/noExplicitAny: IPC listener
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('window-update', subscription);
    return () => ipcRenderer.removeListener('window-update', subscription);
  },
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic stats data
  onStatsUpdate: (callback: (data: any) => void) => {
    // biome-ignore lint/suspicious/noExplicitAny: IPC listener
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('stats-update', subscription);
    return () => ipcRenderer.removeListener('stats-update', subscription);
  },
  // biome-ignore lint/suspicious/noExplicitAny: Proxy config
  startProxy: (config: any) => ipcRenderer.invoke('start-proxy', config),
  scanNetwork: () => ipcRenderer.invoke('scan-network'),
  stopProcess: () => ipcRenderer.invoke('stop-process'),
  getLocalIp: () => ipcRenderer.invoke('get-local-ip'),
  // biome-ignore lint/suspicious/noExplicitAny: Packet data
  onPacketCapture: (callback: (data: any) => void) => {
    // biome-ignore lint/suspicious/noExplicitAny: IPC listener
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('packet-capture', subscription);
    return () => ipcRenderer.removeListener('packet-capture', subscription);
  },
  getFilePath: (file: File) => webUtils.getPathForFile(file),
});
