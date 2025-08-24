"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('api', {
    startServer: (config) => electron_1.ipcRenderer.invoke('start-server', config),
    sendFile: (config) => electron_1.ipcRenderer.invoke('send-file', config),
    onLog: (callback) => {
        electron_1.ipcRenderer.on('python-log', (_event, value) => callback(value));
    }
});
