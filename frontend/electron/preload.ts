import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('api', {
  startServer: (config: any) => ipcRenderer.invoke('start-server', config),
  sendFile: (config: any) => ipcRenderer.invoke('send-file', config),
  onLog: (callback: (log: string) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('python-log', subscription);
    return () => ipcRenderer.removeListener('python-log', subscription);
  },
  onWindowUpdate: (callback: (data: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('window-update', subscription);
    return () => ipcRenderer.removeListener('window-update', subscription);
  },
  onStatsUpdate: (callback: (data: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('stats-update', subscription);
    return () => ipcRenderer.removeListener('stats-update', subscription);
  },
  startProxy: (config: any) => ipcRenderer.invoke('start-proxy', config),
  scanNetwork: () => ipcRenderer.invoke('scan-network'),
  stopProcess: () => ipcRenderer.invoke('stop-process'),
  getLocalIp: () => ipcRenderer.invoke('get-local-ip'),
  onPacketCapture: (callback: (data: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('packet-capture', subscription);
    return () => ipcRenderer.removeListener('packet-capture', subscription);
  },
  getFilePath: (file: File) => webUtils.getPathForFile(file),
});
