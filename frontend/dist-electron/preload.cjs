"use strict";

// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("api", {
  startServer: (config) => import_electron.ipcRenderer.invoke("start-server", config),
  sendFile: (config) => import_electron.ipcRenderer.invoke("send-file", config),
  onLog: (callback) => {
    const subscription = (_event, value) => callback(value);
    import_electron.ipcRenderer.on("python-log", subscription);
    return () => import_electron.ipcRenderer.removeListener("python-log", subscription);
  },
  onWindowUpdate: (callback) => {
    const subscription = (_event, value) => callback(value);
    import_electron.ipcRenderer.on("window-update", subscription);
    return () => import_electron.ipcRenderer.removeListener("window-update", subscription);
  },
  onStatsUpdate: (callback) => {
    const subscription = (_event, value) => callback(value);
    import_electron.ipcRenderer.on("stats-update", subscription);
    return () => import_electron.ipcRenderer.removeListener("stats-update", subscription);
  },
  startProxy: (config) => import_electron.ipcRenderer.invoke("start-proxy", config),
  scanNetwork: () => import_electron.ipcRenderer.invoke("scan-network"),
  stopProcess: () => import_electron.ipcRenderer.invoke("stop-process"),
  getLocalIp: () => import_electron.ipcRenderer.invoke("get-local-ip"),
  onPacketCapture: (callback) => {
    const subscription = (_event, value) => callback(value);
    import_electron.ipcRenderer.on("packet-capture", subscription);
    return () => import_electron.ipcRenderer.removeListener("packet-capture", subscription);
  },
  getFilePath: (file) => import_electron.webUtils.getPathForFile(file)
});
