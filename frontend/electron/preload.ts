import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  startServer: (config: any) => ipcRenderer.invoke('start-server', config),
  sendFile: (config: any) => ipcRenderer.invoke('send-file', config),
  onLog: (callback: (log: string) => void) => {
      ipcRenderer.on('python-log', (_event, value) => callback(value));
  }
});
