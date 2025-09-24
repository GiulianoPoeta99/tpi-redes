"use strict";

// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("api", {
  startServer: (config) => import_electron.ipcRenderer.invoke("start-server", config),
  sendFile: (config) => import_electron.ipcRenderer.invoke("send-file", config),
  onLog: (callback) => {
    import_electron.ipcRenderer.on("python-log", (_event, value) => callback(value));
  },
  onWindowUpdate: (callback) => {
    import_electron.ipcRenderer.on("window-update", (_event, value) => callback(value));
  },
  onStatsUpdate: (callback) => {
    import_electron.ipcRenderer.on("stats-update", (_event, value) => callback(value));
  },
  startProxy: (config) => import_electron.ipcRenderer.invoke("start-proxy", config),
  scanNetwork: () => import_electron.ipcRenderer.invoke("scan-network"),
  onPacketCapture: (callback) => {
    import_electron.ipcRenderer.on("packet-capture", (_event, value) => callback(value));
  }
});
