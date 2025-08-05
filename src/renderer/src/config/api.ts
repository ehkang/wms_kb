// API 配置模块 - 根据运行环境自动切换 API 地址

// 检测是否在 Electron 环境中运行
// @ts-ignore
const isElectron = typeof window !== 'undefined' && window.electron !== undefined

// 检测是否在开发环境
const isDev = import.meta.env.DEV

// 从环境变量获取 API 地址，如果没有则使用默认值
const WMS_HOST = import.meta.env.VITE_WMS_API_URL || 'http://10.20.88.14:8008'
const WCS_HOST = import.meta.env.VITE_WCS_API_URL || 'http://10.20.88.14:8009'

export const API_CONFIG = {
  // WMS API 基础路径
  WMS_BASE_URL: isElectron 
    ? `${WMS_HOST}/api/warehouse`      // Electron 环境：直接访问完整 URL
    : '/api/warehouse',                 // Web 开发环境：使用 Vite 代理路径
    
  // WCS API 基础路径
  WCS_BASE_URL: isElectron
    ? `${WCS_HOST}/api/WCS`            // Electron 环境：直接访问完整 URL
    : '/api/WCS',                      // Web 开发环境：使用 Vite 代理路径
    
  // WebSocket/SignalR Hub URL
  WS_URL: isElectron
    ? `${WCS_HOST}/hubs/wcsHub`        // Electron 环境：直接访问完整 URL
    : '/hubs/wcsHub',                  // Web 开发环境：使用 Vite 代理路径
    
  // 调试信息
  DEBUG_INFO: {
    isElectron,
    isDev,
    wmsHost: WMS_HOST,
    wcsHost: WCS_HOST
  }
}

// 打印配置信息，方便调试
if (isDev) {
  console.log('API Configuration:', {
    environment: isElectron ? 'Electron' : 'Web Browser',
    mode: isDev ? 'Development' : 'Production',
    config: API_CONFIG
  })
}