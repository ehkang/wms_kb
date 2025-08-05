# WMS Dashboard Electron 应用

基于原始 kanban.html 重新实现的 Electron + Vue 3 版本。

## 功能特性

- ✅ 实时监控仓库托盘状态
- ✅ 显示货物详细信息
- ✅ WebSocket 实时数据更新
- ✅ 设备坐标实时显示
- ✅ 系统日志记录
- ✅ 支持 URL 参数指定工位（?p=Tran3004）

## 环境配置

应用支持两种运行环境：

### 1. Web 开发环境
- 使用 Vite 开发服务器
- 通过代理解决跨域问题
- API 请求通过 `/api/*` 路径代理到实际服务器

### 2. Electron 环境
- 直接访问 API 服务器
- 无需代理，无跨域限制
- 打包成独立桌面应用

## 开发指南

### 安装依赖
```bash
pnpm install
```

### 开发模式
```bash
# Web 开发（带代理）
pnpm dev

# 查看 API 配置信息
# 打开控制台会显示当前环境和 API 配置
```

### 构建应用
```bash
# Windows
pnpm build:win

# macOS
pnpm build:mac

# Linux
pnpm build:linux
```

## API 配置

### 环境变量
修改 `.env.*` 文件来配置不同环境的 API 地址：

```env
# .env.development
VITE_WMS_API_URL=http://10.20.88.14:8008
VITE_WCS_API_URL=http://10.20.88.14:8009

# .env.production
VITE_WMS_API_URL=http://production-server:8008
VITE_WCS_API_URL=http://production-server:8009
```

### 代理配置
Web 开发环境的代理配置在 `electron.vite.config.ts` 中：

```typescript
proxy: {
  '/api/warehouse': {
    target: 'http://10.20.88.14:8008',
    changeOrigin: true
  },
  '/api/WCS': {
    target: 'http://10.20.88.14:8009',
    changeOrigin: true
  }
}
```

## 项目结构

```
src/renderer/src/
├── config/
│   └── api.ts          # API 配置（环境检测）
├── stores/
│   └── wms.ts          # 状态管理
├── views/
│   └── Dashboard.vue   # 主界面
├── App.vue             # 根组件
└── main.ts             # 入口文件
```

## 技术栈

- Electron 35.x
- Vue 3
- TypeScript
- Vite
- axios
- @microsoft/signalr