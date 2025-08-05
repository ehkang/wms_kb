"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  config: {
    get: (key) => electron.ipcRenderer.invoke("config:get", key),
    set: (key, value) => electron.ipcRenderer.invoke("config:set", key, value),
    getAll: () => electron.ipcRenderer.invoke("config:getAll"),
    has: (key) => electron.ipcRenderer.invoke("config:has", key),
    delete: (key) => electron.ipcRenderer.invoke("config:delete", key),
    clear: () => electron.ipcRenderer.invoke("config:clear"),
    getPath: () => electron.ipcRenderer.invoke("config:getPath")
  }
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
