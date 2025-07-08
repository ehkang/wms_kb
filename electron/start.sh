#!/bin/bash

# WMS Dashboard Electron 快速启动脚本

echo "🚀 启动 WMS Dashboard Electron..."
echo ""

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    npm install
    echo ""
fi

# 检查外部库文件
if [ ! -f "lib/axios.min.js" ] || [ ! -f "lib/signalr.min.js" ]; then
    echo "📥 下载外部依赖库..."
    
    # 创建lib目录
    mkdir -p lib
    
    # 下载Axios
    echo "下载 Axios..."
    wget -q -O lib/axios.min.js https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js
    
    # 下载SignalR
    echo "下载 SignalR..."
    wget -q -O lib/signalr.min.js "https://cdn.jsdelivr.net/npm/@microsoft/signalr/dist/browser/signalr.min.js"
    
    echo "✅ 依赖库下载完成"
    echo ""
fi

# 启动应用
echo "🎯 启动应用..."
npm start