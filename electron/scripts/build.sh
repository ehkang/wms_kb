#!/bin/bash

# WMS Dashboard Electron 构建脚本
# 支持Windows 7及以上系统

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} WMS Dashboard Electron 构建工具${NC}"
echo -e "${BLUE} (Windows 7 兼容版本)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi

# 显示版本信息
echo -e "${YELLOW}环境信息:${NC}"
echo "Node.js版本: $(node --version)"
echo "npm版本: $(npm --version)"
echo ""

# 安装依赖
echo -e "${YELLOW}安装依赖...${NC}"
npm install

# 下载外部库
echo -e "${YELLOW}下载外部依赖库...${NC}"
if [ ! -f "lib/axios.min.js" ] || [ ! -f "lib/signalr.min.js" ]; then
    echo "下载 Axios..."
    wget -q -O lib/axios.min.js https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js
    
    echo "下载 SignalR..."
    wget -q -O lib/signalr.min.js "https://cdn.jsdelivr.net/npm/@microsoft/signalr/dist/browser/signalr.min.js"
    
    echo -e "${GREEN}✓ 外部依赖下载完成${NC}"
else
    echo -e "${GREEN}✓ 外部依赖已存在${NC}"
fi

echo ""

# 构建应用
echo -e "${YELLOW}开始构建应用...${NC}"

# 清理旧的构建文件
if [ -d "dist" ]; then
    rm -rf dist/
    echo "清理旧的构建文件"
fi

# 构建参数
BUILD_TARGET=${1:-"all"}

case $BUILD_TARGET in
    "win64")
        echo "构建 Windows 64位版本..."
        npm run build:win64
        ;;
    "win32")
        echo "构建 Windows 32位版本..."
        npm run build:win32
        ;;
    "portable")
        echo "构建便携版..."
        npm run build:win
        ;;
    "all"|*)
        echo "构建所有Windows版本..."
        npm run build:all
        ;;
esac

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 构建完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 显示构建结果
if [ -d "dist" ]; then
    echo -e "${YELLOW}构建文件:${NC}"
    ls -la dist/
    echo ""
    
    # 计算文件大小
    total_size=$(du -sh dist/ | cut -f1)
    echo -e "${BLUE}总大小: ${total_size}${NC}"
    echo ""
    
    echo -e "${YELLOW}使用说明:${NC}"
    echo "1. 安装版: 运行 dist/ 目录中的 .exe 安装程序"
    echo "2. 便携版: 直接运行 dist/ 目录中的便携版程序"
    echo "3. 兼容性: 支持 Windows 7/8/10/11 (32位和64位)"
    echo ""
    
    echo -e "${GREEN}✅ 可以将 dist/ 目录复制到目标机器上使用${NC}"
else
    echo -e "${RED}❌ 构建失败，未找到输出目录${NC}"
    exit 1
fi