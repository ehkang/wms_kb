import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [vue()],
    server: {
      proxy: {
        '/api/warehouse': {
          target: 'http://10.20.88.14:8008',
          changeOrigin: true,
        },
        '/api/WCS': {
          target: 'http://10.20.88.14:8009',
          changeOrigin: true,
        },
        '/hubs/wcsHub': {
          target: 'http://10.20.88.14:8009',
          changeOrigin: true,
          ws: true
        },
        // nx_one后端API代理 (3D模型等) - 开发环境去掉 /api 前缀
        '/technical': {
          target: 'http://localhost:8888',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // 禁用缓存，确保每次都请求新数据
              proxyReq.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
              proxyReq.setHeader('Pragma', 'no-cache')
              proxyReq.setHeader('Expires', '0')
            })
          }
        },
        // WMS拣货任务API代理
        '/api/wms': {
          target: 'https://aio.wxnanxing.com',
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})
