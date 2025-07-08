#!/bin/bash

# WMS Dashboard 交叉编译脚本
# 支持编译为 Windows, Linux, macOS 平台的可执行文件

set -e

# 项目信息
APP_NAME="wms-dashboard"
VERSION="v1.0.0"
BUILD_TIME=$(date '+%Y-%m-%d %H:%M:%S')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 输出目录
OUTPUT_DIR="./dist"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} WMS Dashboard 交叉编译工具${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "版本: ${GREEN}${VERSION}${NC}"
echo -e "构建时间: ${GREEN}${BUILD_TIME}${NC}"
echo -e "Git提交: ${GREEN}${GIT_COMMIT}${NC}"
echo ""

# 创建输出目录
if [ ! -d "$OUTPUT_DIR" ]; then
    mkdir -p "$OUTPUT_DIR"
    echo -e "${GREEN}✓${NC} 创建输出目录: $OUTPUT_DIR"
fi

# 清理旧文件
rm -f $OUTPUT_DIR/*
echo -e "${GREEN}✓${NC} 清理旧的构建文件"

# 编译函数
build_binary() {
    local os=$1
    local arch=$2
    local ext=$3
    local desc=$4
    
    local filename="${APP_NAME}-${os}-${arch}${ext}"
    local filepath="${OUTPUT_DIR}/${filename}"
    
    echo -e "${YELLOW}正在编译 ${desc}...${NC}"
    
    # 设置构建标签和优化参数
    GOOS=$os GOARCH=$arch go build \
        -ldflags="-w -s -X 'main.Version=${VERSION}' -X 'main.BuildTime=${BUILD_TIME}' -X 'main.GitCommit=${GIT_COMMIT}'" \
        -trimpath \
        -o "$filepath" \
        main.go
    
    if [ $? -eq 0 ]; then
        local size=$(du -h "$filepath" | cut -f1)
        echo -e "${GREEN}✓${NC} ${desc} 编译成功 (${size})"
        
        # 为 Linux 和 macOS 添加执行权限
        if [ "$os" != "windows" ]; then
            chmod +x "$filepath"
        fi
    else
        echo -e "${RED}✗${NC} ${desc} 编译失败"
        return 1
    fi
}

# 编译目标平台
echo -e "${BLUE}开始交叉编译...${NC}"
echo ""

# Windows 64位
build_binary "windows" "amd64" ".exe" "Windows 64位"

# Windows 32位
build_binary "windows" "386" ".exe" "Windows 32位"

# Linux 64位
build_binary "linux" "amd64" "" "Linux 64位"

# Linux ARM64 (适用于 ARM 服务器)
build_binary "linux" "arm64" "" "Linux ARM64"

# macOS 64位 (Intel)
build_binary "darwin" "amd64" "" "macOS Intel"

# macOS ARM64 (Apple Silicon)
build_binary "darwin" "arm64" "" "macOS Apple Silicon"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ 编译完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "构建文件位置: $OUTPUT_DIR"
echo ""
ls -lh $OUTPUT_DIR/
echo ""

# 创建 Windows 启动脚本
echo -e "${YELLOW}创建 Windows 启动脚本...${NC}"

cat > "$OUTPUT_DIR/start-dashboard.bat" << 'EOF'
@echo off
chcp 65001 >nul
title WMS Dashboard

echo.
echo ========================================
echo  WMS Dashboard 启动中...
echo ========================================
echo.

REM 检测系统架构
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set BINARY=wms-dashboard-windows-amd64.exe
) else (
    set BINARY=wms-dashboard-windows-386.exe
)

REM 检查文件是否存在
if not exist "%BINARY%" (
    echo 错误: 找不到可执行文件 %BINARY%
    echo 请确保文件在当前目录中
    pause
    exit /b 1
)

echo 启动程序: %BINARY%
echo.

REM 启动程序
"%BINARY%"

REM 如果程序异常退出，暂停显示错误信息
if errorlevel 1 (
    echo.
    echo 程序异常退出，错误代码: %errorlevel%
    pause
)
EOF

# 创建 Linux 启动脚本
cat > "$OUTPUT_DIR/start-dashboard.sh" << 'EOF'
#!/bin/bash

echo "========================================"
echo " WMS Dashboard 启动中..."
echo "========================================"
echo

# 检测系统架构
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        BINARY="./wms-dashboard-linux-amd64"
        ;;
    aarch64|arm64)
        BINARY="./wms-dashboard-linux-arm64"
        ;;
    *)
        echo "错误: 不支持的架构 $ARCH"
        exit 1
        ;;
esac

# 检查文件是否存在
if [ ! -f "$BINARY" ]; then
    echo "错误: 找不到可执行文件 $BINARY"
    echo "请确保文件在当前目录中"
    exit 1
fi

# 添加执行权限
chmod +x "$BINARY"

echo "启动程序: $BINARY"
echo

# 启动程序
"$BINARY"
EOF

chmod +x "$OUTPUT_DIR/start-dashboard.sh"

echo -e "${GREEN}✓${NC} Windows 启动脚本: start-dashboard.bat"
echo -e "${GREEN}✓${NC} Linux 启动脚本: start-dashboard.sh"
echo ""

# 创建使用说明
cat > "$OUTPUT_DIR/README.txt" << EOF
WMS Dashboard ${VERSION}
========================

构建时间: ${BUILD_TIME}
Git提交: ${GIT_COMMIT}

文件说明:
---------
Windows 用户:
  - wms-dashboard-windows-amd64.exe (Windows 64位)
  - wms-dashboard-windows-386.exe   (Windows 32位)
  - start-dashboard.bat             (Windows 启动脚本)

Linux 用户:
  - wms-dashboard-linux-amd64       (Linux 64位)
  - wms-dashboard-linux-arm64       (Linux ARM64)
  - start-dashboard.sh              (Linux 启动脚本)

macOS 用户:
  - wms-dashboard-darwin-amd64      (macOS Intel)
  - wms-dashboard-darwin-arm64      (macOS Apple Silicon)

使用方法:
---------
1. 选择对应你系统的可执行文件
2. 双击运行，或使用启动脚本
3. 程序会自动打开浏览器访问 Dashboard

注意事项:
---------
- 程序会自动选择可用端口 (默认8080)
- 如果端口被占用，会自动选择其他端口
- Chrome 浏览器会以全屏模式启动
- 程序包含完整的 WMS/WCS API 代理功能

环境变量:
---------
- PORT: 指定端口号 (可选)
  示例: set PORT=9090 && wms-dashboard-windows-amd64.exe

技术支持:
---------
如有问题，请检查控制台输出信息。
EOF

echo -e "${GREEN}✓${NC} 使用说明: README.txt"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 构建完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "📁 所有文件已保存到: ${GREEN}$OUTPUT_DIR${NC}"
echo -e "🚀 可以将整个 ${GREEN}dist${NC} 目录复制到目标机器上使用"
echo ""