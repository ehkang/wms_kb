// API 配置模块 - 根据运行环境自动切换 API 地址

// 检测是否在 Electron 环境中运行
// @ts-ignore
const isElectron = typeof window !== 'undefined' && window.electron !== undefined

// 检测是否在开发环境
const isDev = import.meta.env.DEV

// 从环境变量获取 API 地址，如果没有则使用默认值
const WMS_HOST = import.meta.env.VITE_WMS_API_URL || 'http://10.20.88.14:8008'
const WCS_HOST = import.meta.env.VITE_WCS_API_URL || 'http://10.20.88.14:8009'

// nx_one 后端地址：开发环境 localhost:8888，生产环境 one.wxnanxing.com
const NX_ONE_HOST = isDev
  ? (import.meta.env.VITE_NX_ONE_API_URL || 'http://localhost:8888')
  : 'https://one.wxnanxing.com'

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

  // NX_ONE API 基础路径 (用于获取3D模型等)
  // 开发环境：去掉 /api 前缀，直接使用 /technical/...
  // 生产环境：使用完整路径 https://one.wxnanxing.com/api/technical/...
  NX_ONE_BASE_URL: isDev
    ? (isElectron ? NX_ONE_HOST : '')                    // 开发环境：Electron用完整URL，Web用空（通过代理）
    : `${NX_ONE_HOST}/api`,                              // 生产环境：https://one.wxnanxing.com/api

  // 3D模型API完整路径
  MODEL_3D_URL: isDev
    ? (isElectron ? `${NX_ONE_HOST}/technical/drawing/model3d` : '/technical/drawing/model3d')
    : `${NX_ONE_HOST}/api/technical/drawing/model3d`,

  // 调试信息
  DEBUG_INFO: {
    isElectron,
    isDev,
    wmsHost: WMS_HOST,
    wcsHost: WCS_HOST,
    nxOneHost: NX_ONE_HOST
  }
}

// 配置信息已就绪