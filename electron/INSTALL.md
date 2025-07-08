# WMS Dashboard Electron 安装指南

## 系统要求

- Node.js 14.0.0 或更高版本
- npm (随 Node.js 一起安装)
- 网络连接（用于下载依赖）

## 安装步骤

### 1. 安装 Node.js

如果尚未安装 Node.js，请从 https://nodejs.org 下载并安装。

验证安装：
```bash
node --version
npm --version
```

### 2. 快速启动（推荐）

```bash
cd electron
./start.sh
```

这个脚本会自动：
- 安装 npm 依赖
- 下载外部库文件
- 启动开发模式

### 3. 手动安装

如果快速启动脚本无法运行，可以手动执行：

```bash
# 进入项目目录
cd electron

# 安装依赖
npm install

# 下载外部库
mkdir -p lib
wget -O lib/axios.min.js https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js
wget -O lib/signalr.min.js "https://cdn.jsdelivr.net/npm/@microsoft/signalr/dist/browser/signalr.min.js"

# 启动开发模式
npm start
```

### 4. 构建发布版本

```bash
# 安装electron-builder（如果尚未安装）
npm install

# 构建所有版本
npm run build:all

# 或使用构建脚本
./scripts/build.sh
```

## 开发模式

开发模式下，应用会：
- 自动打开开发者工具
- 启用热重载
- 显示详细错误信息

## 发布模式

构建完成后，在 `dist/` 目录中会生成：
- Windows 安装程序（.exe）
- 便携版程序
- 32位和64位版本

## 常见问题

### 权限错误
如果遇到权限错误，请确保脚本有执行权限：
```bash
chmod +x start.sh
chmod +x scripts/build.sh
```

### 网络问题
如果无法下载依赖，请检查：
- 网络连接
- 防火墙设置
- 代理配置

### Node.js 版本
确保使用 Node.js 14.0.0 或更高版本。可以使用 nvm 管理多个 Node.js 版本。

## 目录结构

安装完成后的目录结构：
```
electron/
├── node_modules/          # npm 依赖
├── src/                   # 源代码
├── assets/                # 资源文件
├── lib/                   # 外部库
├── scripts/               # 构建脚本
├── dist/                  # 构建输出（构建后生成）
├── package.json           # 项目配置
├── start.sh              # 快速启动脚本
└── README.md             # 项目说明
```