import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  startServer: (config: any) => ipcRenderer.invoke('start-server', config),
  sendFile: (config: any) => ipcRenderer.invoke('send-file', config),
  onLog: (callback: (log: string) => void) => {
      ipcRenderer.on('python-log', (_event, value) => callback(value));
  },
  onWindowUpdate: (callback: (data: any) => void) => {
      ipcRenderer.on('window-update', (_event, value) => callback(value));
  },
  onStatsUpdate: (callback: (data: any) => void) => {
      ipcRenderer.on('stats-update', (_event, value) => callback(value));
  },
  startProxy: (config: any) => ipcRenderer.invoke('start-proxy', config),
  scanNetwork: () => ipcRenderer.invoke('scan-network'),
  onPacketCapture: (callback: (data: any) => void) => {
      ipcRenderer.on('packet-capture', (_event, value) => callback(value));
  }
});
