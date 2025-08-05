// 持久化存储的类型定义

export interface StoreData {
  station: string
  // 可以在这里添加其他配置项
  [key: string]: any
}

export interface StoreAPI {
  get: <K extends keyof StoreData>(key: K) => Promise<StoreData[K]>
  set: <K extends keyof StoreData>(key: K, value: StoreData[K]) => Promise<void>
  getAll: () => Promise<StoreData>
  has: (key: string) => Promise<boolean>
  delete: (key: string) => Promise<void>
  clear: () => Promise<void>
  getPath: () => Promise<string>
}