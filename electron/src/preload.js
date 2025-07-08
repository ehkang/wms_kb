const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getAppInfo: () => ({
    name: 'WMS Dashboard',
    version: '1.0.0',
    platform: process.platform,
    arch: process.arch
  }),
  
  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // 系统信息
  getSystemInfo: () => ({
    platform: process.platform,
    arch: process.arch,
    version: process.version,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node
  }),
  
  // 通知功能
  showNotification: (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  },
  
  // 日志功能
  log: (...args) => {
    console.log('[Renderer]', ...args);
  },
  
  error: (...args) => {
    console.error('[Renderer]', ...args);
  }
});

// 注入一些全局变量到窗口对象
window.addEventListener('DOMContentLoaded', () => {
  // 标识这是Electron环境
  window.isElectron = true;
  
  // 禁用右键菜单（生产环境）
  if (!process.argv.includes('--dev')) {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
  
  // 禁用F12开发者工具（生产环境）
  if (!process.argv.includes('--dev')) {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
      }
    });
  }
  
  // 添加Electron样式类
  document.body.classList.add('electron-app');
  
  // 设置应用标题
  document.title = 'WMS Dashboard - 仓储管理系统';
  
  console.log('Electron preload script loaded');
});