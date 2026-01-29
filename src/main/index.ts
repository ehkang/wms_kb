import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as fs from 'fs'

// 使用 Electron 的 userData 路径存储配置
// 这是 Electron 官方推荐的持久化存储位置
const getUserDataPath = () => app.getPath('userData')
const getConfigPath = () => join(getUserDataPath(), 'user-preferences.json')

// 增强的持久化存储实现
class PersistentStore {
  private data: Record<string, any> = {}
  private defaults: Record<string, any> = {
    station: 'Tran3001'
  }
  
  constructor() {
    this.ensureUserDataDir()
    this.load()
  }
  
  // 确保用户数据目录存在
  private ensureUserDataDir() {
    const userDataDir = getUserDataPath()
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true })
    }
  }
  
  // 同步加载配置
  private load() {
    try {
      const configPath = getConfigPath()
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8')
        const loadedData = JSON.parse(content)
        // 合并默认值和加载的数据
        this.data = { ...this.defaults, ...loadedData }
      } else {
        // 使用默认值
        this.data = { ...this.defaults }
        this.save()
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
      // 出错时使用默认值
      this.data = { ...this.defaults }
      // 尝试备份损坏的配置文件
      this.backupCorruptedConfig()
    }
  }
  
  // 同步保存配置
  private save() {
    try {
      const configPath = getConfigPath()
      const tempPath = configPath + '.tmp'
      
      // 先写入临时文件，然后原子性地替换
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2))
      fs.renameSync(tempPath, configPath)
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }
  
  // 异步保存配置
  async saveAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const configPath = getConfigPath()
        const tempPath = configPath + '.tmp'
        
        fs.writeFile(tempPath, JSON.stringify(this.data, null, 2), (err) => {
          if (err) {
            reject(err)
            return
          }
          
          fs.rename(tempPath, configPath, (err) => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          })
        })
      } catch (error) {
        reject(error)
      }
    })
  }
  
  // 备份损坏的配置文件
  private backupCorruptedConfig() {
    try {
      const configPath = getConfigPath()
      if (fs.existsSync(configPath)) {
        const backupPath = configPath + '.backup.' + Date.now()
        fs.copyFileSync(configPath, backupPath)
        console.log(`Backed up corrupted config to: ${backupPath}`)
      }
    } catch (error) {
      console.error('Failed to backup corrupted config:', error)
    }
  }
  
  // 获取配置值
  get(key: string): any {
    return this.data[key] ?? this.defaults[key]
  }
  
  // 设置配置值
  set(key: string, value: any): void {
    this.data[key] = value
    this.save()
  }
  
  // 异步设置配置值
  async setAsync(key: string, value: any): Promise<void> {
    this.data[key] = value
    await this.saveAsync()
  }
  
  // 删除配置值
  delete(key: string): void {
    delete this.data[key]
    this.save()
  }
  
  // 检查是否存在某个键
  has(key: string): boolean {
    return key in this.data
  }
  
  // 清空所有配置（保留默认值）
  clear(): void {
    this.data = { ...this.defaults }
    this.save()
  }
  
  // 获取所有配置
  get store(): Record<string, any> {
    return { ...this.data }
  }
  
  // 获取配置文件路径（用于调试）
  getConfigPath(): string {
    return getConfigPath()
  }
}

// 创建持久化存储实例
const store = new PersistentStore()

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    fullscreen: true,  // 启动时全屏
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // ✅ 生产环境自动设置开机自启
  if (!is.dev) {
    console.log('🚀 生产环境：启用开机自启')
    app.setLoginItemSettings({
      openAtLogin: true,           // 开机自启
      openAsHidden: false,         // 不隐藏启动（直接显示窗口）
      path: process.execPath,      // 可执行文件路径
      args: []                     // 启动参数（如需要可添加 --minimized 等）
    })
  } else {
    console.log('🔧 开发环境：不设置开机自启')
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // IPC handlers for configuration
  ipcMain.handle('config:get', async (_, key: string) => {
    return store.get(key)
  })

  ipcMain.handle('config:set', async (_, key: string, value: any) => {
    // 使用异步方法保存，确保数据持久化
    await store.setAsync(key, value)
  })

  ipcMain.handle('config:getAll', async () => {
    return store.store
  })
  
  ipcMain.handle('config:has', async (_, key: string) => {
    return store.has(key)
  })
  
  ipcMain.handle('config:delete', async (_, key: string) => {
    store.delete(key)
  })
  
  ipcMain.handle('config:clear', async () => {
    store.clear()
  })
  
  // 调试用：获取配置文件路径
  ipcMain.handle('config:getPath', async () => {
    return store.getConfigPath()
  })

  // ✅ 开机自启 IPC 处理器（方便前端查询和控制）
  ipcMain.handle('auto-launch:get', () => {
    const settings = app.getLoginItemSettings()
    return settings.openAtLogin
  })

  ipcMain.handle('auto-launch:set', (_, enabled: boolean) => {
    console.log(`${enabled ? '✅ 启用' : '❌ 禁用'}开机自启`)
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: false,
      path: process.execPath,
      args: []
    })
    return true
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
