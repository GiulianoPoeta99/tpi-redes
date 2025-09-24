import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('api', {
    startServer: (config) => ipcRenderer.invoke('start-server', config),
    sendFile: (config) => ipcRenderer.invoke('send-file', config),
    onLog: (callback) => {
        ipcRenderer.on('python-log', (_event, value) => callback(value));
    },
    onWindowUpdate: (callback) => {
        ipcRenderer.on('window-update', (_event, value) => callback(value));
    },
    onStatsUpdate: (callback) => {
        ipcRenderer.on('stats-update', (_event, value) => callback(value));
    },
    startProxy: (config) => ipcRenderer.invoke('start-proxy', config),
    scanNetwork: () => ipcRenderer.invoke('scan-network'),
    onPacketCapture: (callback) => {
        ipcRenderer.on('packet-capture', (_event, value) => callback(value));
    }
});
