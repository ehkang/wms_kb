import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      config: {
        get: (key: string) => Promise<any>
        set: (key: string, value: any) => Promise<void>
        getAll: () => Promise<Record<string, any>>
        has: (key: string) => Promise<boolean>
        delete: (key: string) => Promise<void>
        clear: () => Promise<void>
        getPath: () => Promise<string>
      }
    }
  }
}
