#!/bin/bash

# 手动打包脚本 - 使用electron-packager，无需网络下载
# 解决electron-builder网络问题

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} WMS Dashboard 手动打包工具${NC}"
echo -e "${BLUE} (使用electron-packager，兼容Win7)${NC}"
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
    echo -e "${GREEN}✓ 外部库下载完成${NC}"
fi

# 清理旧构建
rm -rf dist/

echo -e "${YELLOW}开始打包...${NC}"

# 打包Windows 64位
echo -e "${YELLOW}打包 Windows 64位版本...${NC}"
npx electron-packager . "WMS Dashboard" \
  --platform=win32 \
  --arch=x64 \
  --out=dist \
  --overwrite \
  --app-version=1.0.0 \
  --build-version=1.0.0 \
  --app-copyright="WMS Team" \
  --ignore="node_modules/electron-packager" \
  --ignore="scripts" \
  --ignore="README.md" \
  --ignore="INSTALL.md" \
  --ignore="start.sh" \
  --ignore=".git"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Windows 64位版本打包完成${NC}"
else
    echo -e "${RED}✗ Windows 64位版本打包失败${NC}"
    exit 1
fi

# 打包Windows 32位
echo -e "${YELLOW}打包 Windows 32位版本...${NC}"
npx electron-packager . "WMS Dashboard" \
  --platform=win32 \
  --arch=ia32 \
  --out=dist \
  --overwrite \
  --app-version=1.0.0 \
  --build-version=1.0.0 \
  --app-copyright="WMS Team" \
  --ignore="node_modules/electron-packager" \
  --ignore="scripts" \
  --ignore="README.md" \
  --ignore="INSTALL.md" \
  --ignore="start.sh" \
  --ignore=".git"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Windows 32位版本打包完成${NC}"
else
    echo -e "${RED}✗ Windows 32位版本打包失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 打包完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 显示结果
if [ -d "dist" ]; then
    echo -e "${YELLOW}打包结果:${NC}"
    ls -la dist/
    echo ""
    
    # 为每个版本创建启动脚本和说明
    for dir in dist/*/; do
        if [ -d "$dir" ]; then
            app_name=$(basename "$dir")
            
            # 创建启动脚本
            cat > "$dir/启动WMS Dashboard.bat" << 'EOF'
@echo off
chcp 65001 >nul 2>&1
title WMS Dashboard
echo.
echo ========================================
echo  WMS Dashboard 启动中...
echo  兼容 Windows 7/8/10/11
echo ========================================
echo.
echo 正在启动应用程序...
start "" "WMS Dashboard.exe"
exit
EOF

            # 创建使用说明
            cat > "$dir/使用说明.txt" << EOF
WMS Dashboard v1.0.0
===================

使用方法：
1. 双击 "启动WMS Dashboard.bat" 启动应用
2. 或直接双击 "WMS Dashboard.exe"

系统要求：
- Windows 7 SP1 及以上版本
- 网络连接（用于访问WMS/WCS服务）

架构信息：
- 当前版本：$app_name
- 构建时间：$(date '+%Y-%m-%d %H:%M:%S')

注意事项：
- 首次启动可能需要等待几秒钟
- 确保防火墙允许程序访问网络
- 如遇问题请检查控制台输出

技术支持：WMS Team
EOF

            echo -e "${GREEN}✓ 已为 $app_name 创建启动脚本和说明文档${NC}"
        fi
    done
    
    echo ""
    
    # 计算总大小
    total_size=$(du -sh dist/ | cut -f1)
    echo -e "${BLUE}总大小: ${total_size}${NC}"
    echo ""
    
    echo -e "${YELLOW}发布说明:${NC}"
    echo "1. 将对应架构的文件夹复制到目标Windows机器"
    echo "2. 运行 '启动WMS Dashboard.bat' 即可使用"
    echo "3. 无需安装，绿色便携"
    echo "4. 支持 Windows 7/8/10/11"
    echo ""
    
    echo -e "${GREEN}✅ 可以将 dist/ 目录中的文件夹直接发布使用${NC}"
else
    echo -e "${RED}❌ 打包失败，未找到输出目录${NC}"
    exit 1
fi