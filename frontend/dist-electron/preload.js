import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('api', {
    startServer: (config) => ipcRenderer.invoke('start-server', config),
    sendFile: (config) => ipcRenderer.invoke('send-file', config),
    onLog: (callback) => {
        const subscription = (_event, value) => callback(value);
        ipcRenderer.on('python-log', subscription);
        return () => ipcRenderer.removeListener('python-log', subscription);
    },
    onWindowUpdate: (callback) => {
        const subscription = (_event, value) => callback(value);
        ipcRenderer.on('window-update', subscription);
        return () => ipcRenderer.removeListener('window-update', subscription);
    },
    onStatsUpdate: (callback) => {
        const subscription = (_event, value) => callback(value);
        ipcRenderer.on('stats-update', subscription);
        return () => ipcRenderer.removeListener('stats-update', subscription);
    },
    startProxy: (config) => ipcRenderer.invoke('start-proxy', config),
    scanNetwork: () => ipcRenderer.invoke('scan-network'),
    stopProcess: () => ipcRenderer.invoke('stop-process'),
    getLocalIp: () => ipcRenderer.invoke('get-local-ip'),
    onPacketCapture: (callback) => {
        const subscription = (_event, value) => callback(value);
        ipcRenderer.on('packet-capture', subscription);
        return () => ipcRenderer.removeListener('packet-capture', subscription);
    },
});
