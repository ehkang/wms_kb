# WMS Dashboard Electron

WMS Dashboard 的 Electron 桌面版本，兼容 Windows 7 及以上系统。

## 项目特性

- ✅ **Windows 7 兼容性** - 专门优化支持 Windows 7/8/10/11
- ✅ **本地化依赖** - 无需外部 CDN，完全自包含
- ✅ **响应式界面** - 现代化的仓储管理系统界面
- ✅ **实时数据** - 支持 WebSocket 实时数据推送
- ✅ **跨平台** - 支持 32位 和 64位 Windows 系统

## 项目结构

```
electron/
├── src/                    # 源代码
│   ├── main.js            # Electron 主进程
│   └── preload.js         # 预加载脚本
├── assets/                # 资源文件
│   └── index.html         # 主页面（已处理外部依赖）
├── lib/                   # 本地化的外部库
│   ├── axios.min.js       # HTTP 请求库
│   └── signalr.min.js     # WebSocket 通信库
├── scripts/               # 构建脚本
│   ├── build.sh           # 构建脚本
│   └── download-libs.js   # 依赖下载脚本
├── package.json           # 项目配置
└── README.md             # 项目说明
```

## 快速开始

### 1. 安装依赖

```bash
cd electron
npm install
```

### 2. 下载外部库（如果需要）

```bash
npm run prepare-libs
```

或手动下载：
```bash
cd lib
wget -O axios.min.js https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js
wget -O signalr.min.js "https://cdn.jsdelivr.net/npm/@microsoft/signalr/dist/browser/signalr.min.js"
```

### 3. 开发模式运行

```bash
npm start
# 或
npm run dev
```

### 4. 构建应用

```bash
# 构建所有版本
npm run build:all

# 只构建 64位版本
npm run build:win64

# 只构建 32位版本
npm run build:win32

# 使用构建脚本
chmod +x scripts/build.sh
./scripts/build.sh
```

## 构建输出

构建完成后，将在 `dist/` 目录生成以下文件：

### 安装版
- `WMS Dashboard Setup 1.0.0.exe` - 64位安装程序
- `WMS Dashboard Setup 1.0.0-ia32.exe` - 32位安装程序

### 便携版
- `WMS-Dashboard-Portable-1.0.0-x64.exe` - 64位便携版
- `WMS-Dashboard-Portable-1.0.0-ia32.exe` - 32位便携版

## 部署说明

### Windows 7 兼容性

本项目特别优化了 Windows 7 兼容性：

1. **Electron 版本**: 使用 Electron 22.x（支持 Windows 7）
2. **硬件加速**: 自动检测 Windows 7 并禁用硬件加速
3. **本地化依赖**: 移除所有外部 CDN 依赖
4. **系统字体**: 使用系统自带字体，无需 Google Fonts

### 系统要求

- **操作系统**: Windows 7 SP1 及以上
- **架构**: 32位 或 64位
- **内存**: 最低 2GB RAM
- **磁盘空间**: 最低 200MB 可用空间
- **网络**: 需要连接到 WMS/WCS 后端服务

### 后端服务配置

应用需要连接到后端服务，确保以下服务可访问：

- **WMS API**: `http://10.20.88.14:8008`
- **WCS API**: `http://10.20.88.14:8009`
- **WebSocket**: `/hubs/wcsHub`

## 开发说明

### 修改后端地址

如需修改后端服务地址，编辑 `assets/index.html` 文件中的 API 配置。

### 添加新功能

1. 修改 `assets/index.html` 中的前端代码
2. 如需新的 Electron API，修改 `src/preload.js`
3. 主进程逻辑修改 `src/main.js`

### 调试

- 开发模式会自动打开开发者工具
- 使用 `console.log` 输出调试信息
- 检查主进程日志：`npm start` 的控制台输出

## 常见问题

### Q: Windows 7 上无法启动？
A: 确保安装了最新的 Windows 更新，特别是 .NET Framework 4.5+ 和 Visual C++ 运行库。

### Q: 无法连接到后端服务？
A: 检查网络连接和防火墙设置，确保可以访问后端服务地址。

### Q: 界面显示异常？
A: 在开发者工具中检查控制台错误，可能是 JavaScript 运行异常。

### Q: 如何更新应用？
A: 重新下载最新版本的安装程序进行安装，或替换便携版的可执行文件。

## 技术支持

如有问题，请检查：

1. 控制台错误信息
2. 网络连接状态
3. 后端服务状态
4. 防火墙和安全软件设置

## 许可证

MIT License