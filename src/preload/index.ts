import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
    getAll: () => ipcRenderer.invoke('config:getAll'),
    has: (key: string) => ipcRenderer.invoke('config:has', key),
    delete: (key: string) => ipcRenderer.invoke('config:delete', key),
    clear: () => ipcRenderer.invoke('config:clear'),
    getPath: () => ipcRenderer.invoke('config:getPath')
  },
  // ✅ 开机自启 API
  autoLaunch: {
    get: () => ipcRenderer.invoke('auto-launch:get'),
    set: (enabled: boolean) => ipcRenderer.invoke('auto-launch:set', enabled)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    // 静默处理错误
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
