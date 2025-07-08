const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

// 应用信息
const APP_NAME = 'WMS Dashboard';
const APP_VERSION = '1.0.0';

// 全局变量
let mainWindow = null;
let goBackendProcess = null;
let isDev = process.argv.includes('--dev');

// Windows 7 兼容性设置
if (os.platform() === 'win32') {
  // 设置应用用户模型ID，提高Windows 7兼容性
  app.setAppUserModelId('com.wms.dashboard');
}

// 创建主窗口
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    title: APP_NAME,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: !isDev, // 开发模式下禁用web安全以便测试
      preload: path.join(__dirname, 'preload.js')
    },
    show: false, // 先隐藏，等加载完成后再显示
    backgroundColor: '#0a0a0a', // 设置背景色匹配应用主题
    titleBarStyle: 'default',
    autoHideMenuBar: true, // 自动隐藏菜单栏
    // Windows 7 特定设置
    frame: true,
    transparent: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    closable: true
  });

  // 加载HTML文件
  const htmlPath = path.join(__dirname, '../assets/index.html');
  mainWindow.loadFile(htmlPath);

  // 窗口准备就绪后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 开发模式下打开开发者工具
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
    
    // 显示启动信息
    console.log(`${APP_NAME} v${APP_VERSION} 启动成功`);
    console.log(`系统平台: ${os.platform()} ${os.arch()}`);
    console.log(`Node.js版本: ${process.version}`);
    console.log(`Electron版本: ${process.versions.electron}`);
  });

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 阻止新窗口打开，在默认浏览器中打开链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // 处理页面加载错误
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription);
    
    // 显示错误页面
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>加载错误</title>
        <style>
          body { 
            font-family: 'Microsoft YaHei', Arial, sans-serif; 
            background: #0a0a0a; 
            color: #ffffff; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0;
          }
          .error-container {
            text-align: center;
            max-width: 600px;
            padding: 40px;
          }
          .error-icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          .error-title {
            font-size: 24px;
            margin-bottom: 16px;
            color: #ff5252;
          }
          .error-message {
            font-size: 16px;
            margin-bottom: 24px;
            color: #a0a0a0;
            line-height: 1.5;
          }
          .retry-button {
            background: #00d4ff;
            color: #000;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
          }
          .retry-button:hover {
            background: #00bfe6;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <div class="error-title">页面加载失败</div>
          <div class="error-message">
            错误代码: ${errorCode}<br>
            错误描述: ${errorDescription}<br><br>
            可能的原因：<br>
            1. 网络连接问题<br>
            2. 后端服务未启动<br>
            3. 防火墙阻止连接
          </div>
          <button class="retry-button" onclick="location.reload()">重试</button>
        </div>
      </body>
      </html>
    `;
    
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
  });

  return mainWindow;
}

// 创建应用菜单
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '刷新',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.reload();
            }
          }
        },
        {
          label: '强制刷新',
          accelerator: 'Ctrl+F5',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.reloadIgnoringCache();
            }
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '查看',
      submenu: [
        {
          label: '实际大小',
          accelerator: 'Ctrl+0',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.setZoomLevel(0);
            }
          }
        },
        {
          label: '放大',
          accelerator: 'Ctrl+Plus',
          click: () => {
            if (mainWindow) {
              const currentZoom = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
            }
          }
        },
        {
          label: '缩小',
          accelerator: 'Ctrl+-',
          click: () => {
            if (mainWindow) {
              const currentZoom = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
            }
          }
        },
        { type: 'separator' },
        {
          label: '全屏',
          accelerator: 'F11',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          }
        },
        {
          label: '开发者工具',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: APP_NAME,
              detail: `版本: ${APP_VERSION}\\n\\n仓储管理系统桌面版\\n兼容 Windows 7/8/10/11\\n\\n技术支持: WMS Team`,
              buttons: ['确定']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 应用程序事件处理
app.whenReady().then(() => {
  // 创建主窗口
  createMainWindow();
  
  // 创建菜单
  createMenu();
  
  // macOS 特定处理
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// 所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  // 关闭后端进程
  if (goBackendProcess) {
    goBackendProcess.kill();
    goBackendProcess = null;
  }
});

// 处理协议启动（可选）
app.setAsDefaultProtocolClient('wms-dashboard');

// 处理第二个实例启动
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 如果用户试图运行第二个实例，聚焦到主窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

// 禁用硬件加速（提高Windows 7兼容性）
if (os.platform() === 'win32') {
  // 检查Windows版本，如果是Windows 7则禁用硬件加速
  const release = os.release();
  if (release.startsWith('6.1')) { // Windows 7
    app.disableHardwareAcceleration();
    console.log('Windows 7 检测到，已禁用硬件加速以提高兼容性');
  }
}

// 导出模块（用于测试）
module.exports = { createMainWindow, app };