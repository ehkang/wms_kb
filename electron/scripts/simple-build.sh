#!/bin/bash

# 简化版构建脚本 - 不依赖wine
# 只构建目录版本，可以手动打包

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} WMS Dashboard 简化构建${NC}"
echo -e "${BLUE} (不需要wine，构建目录版本)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装依赖...${NC}"
    npm install
fi

# 检查外部库
if [ ! -f "lib/axios.min.js" ] || [ ! -f "lib/signalr.min.js" ]; then
    echo -e "${YELLOW}下载外部库...${NC}"
    mkdir -p lib
    wget -q -O lib/axios.min.js https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js
    wget -q -O lib/signalr.min.js "https://cdn.jsdelivr.net/npm/@microsoft/signalr/dist/browser/signalr.min.js"
fi

# 清理旧构建
rm -rf dist/

echo -e "${YELLOW}开始构建...${NC}"

# 只构建目录版本，避免wine依赖
npm run build

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 构建完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

if [ -d "dist" ]; then
    echo -e "${YELLOW}构建输出:${NC}"
    ls -la dist/
    echo ""
    
    echo -e "${YELLOW}使用说明:${NC}"
    echo "1. 构建的应用在 dist/ 目录中"
    echo "2. 可以直接运行 dist/*/WMS Dashboard.exe"
    echo "3. 将整个对应架构目录复制到目标机器即可使用"
    echo "4. 无需安装，绿色便携"
    echo ""
    
    # 创建启动脚本
    for dir in dist/*/; do
        if [ -d "$dir" ]; then
            arch_name=$(basename "$dir")
            cat > "$dir/启动WMS Dashboard.bat" << 'EOF'
@echo off
chcp 65001 >nul 2>&1
title WMS Dashboard
echo.
echo ========================================
echo  WMS Dashboard 启动中...
echo  (兼容 Windows 7/8/10/11)
echo ========================================
echo.
start "" "WMS Dashboard.exe"
EOF
            echo "已创建启动脚本: $dir/启动WMS Dashboard.bat"
        fi
    done
    
    echo ""
    echo -e "${GREEN}✅ 可以将 dist/ 目录中的对应架构文件夹复制到Windows机器使用${NC}"
else
    echo -e "${RED}❌ 构建失败${NC}"
    exit 1
fi