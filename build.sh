#!/bin/bash

# WMS Dashboard 构建脚本
# 支持多平台编译，重点优化Windows版本

echo "🚀 开始构建 WMS Dashboard..."

# 项目信息
APP_NAME="wms-dashboard"
VERSION="3.0.0"
BUILD_TIME=$(date +"%Y-%m-%d %H:%M:%S")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# 清理旧的构建文件
echo "🧹 清理旧的构建文件..."
rm -rf build/
mkdir -p build/

# 检查依赖
echo "📋 检查项目依赖..."
if ! command -v go &> /dev/null; then
    echo "❌ Go 未安装或未在PATH中"
    exit 1
fi

# 检查必要文件
if [ ! -f "web/kanban.html" ]; then
    echo "❌ 找不到 web/kanban.html 文件"
    exit 1
fi

if [ ! -f "go.mod" ]; then
    echo "📦 初始化 Go 模块..."
    go mod init wms-dashboard
fi

# 下载依赖
echo "📥 下载依赖..."
go mod tidy

# 构建标志
LDFLAGS="-s -w"
LDFLAGS="$LDFLAGS -X 'main.Version=$VERSION'"
LDFLAGS="$LDFLAGS -X 'main.BuildTime=$BUILD_TIME'"
LDFLAGS="$LDFLAGS -X 'main.GitCommit=$GIT_COMMIT'"

echo "🔧 构建配置:"
echo "   版本: $VERSION"
echo "   构建时间: $BUILD_TIME"
echo "   Git提交: $GIT_COMMIT"
echo ""

# 构建函数
build_target() {
    local os=$1
    local arch=$2
    local extension=$3
    local output_name="${APP_NAME}-${os}-${arch}${extension}"
    
    echo "🏗️  构建 ${os}/${arch}..."
    
    export GOOS=$os
    export GOARCH=$arch
    export CGO_ENABLED=0
    
    if go build -ldflags "$LDFLAGS" -o "build/$output_name" .; then
        local size=$(du -h "build/$output_name" | cut -f1)
        echo "   ✅ 构建成功: $output_name ($size)"
        
        # 如果是Windows版本，创建启动脚本
        if [ "$os" = "windows" ]; then
            create_windows_scripts "$output_name"
        fi
    else
        echo "   ❌ 构建失败: ${os}/${arch}"
        return 1
    fi
}

# 创建Windows相关脚本
create_windows_scripts() {
    local exe_name=$1
    
    # 创建启动脚本
    cat > "build/start-dashboard.bat" << 'EOF'
@echo off
title WMS Dashboard
echo 正在启动 WMS Dashboard...
echo.
echo 如果程序无法正常工作，请检查：
echo 1. 网络连接是否正常
echo 2. WMS/WCS服务器是否可访问
echo 3. 防火墙是否允许程序访问网络
echo.
echo 按 Ctrl+C 停止程序
echo =====================================
echo.

REM 启动程序
%~dp0wms-dashboard-windows-amd64.exe

echo.
echo 程序已退出，按任意键关闭窗口...
pause >nul
EOF

    # 创建安装到启动文件夹的脚本
    cat > "build/install-to-startup.bat" << 'EOF'
@echo off
echo 正在安装 WMS Dashboard 到 Windows 启动文件夹...
echo.

REM 获取启动文件夹路径
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

REM 检查启动文件夹是否存在
if not exist "%STARTUP_FOLDER%" (
    echo 错误：找不到启动文件夹
    pause
    exit /b 1
)

REM 复制文件到启动文件夹
echo 复制程序文件...
copy "%~dp0wms-dashboard-windows-amd64.exe" "%STARTUP_FOLDER%\" >nul 2>&1
if errorlevel 1 (
    echo 错误：复制程序文件失败
    pause
    exit /b 1
)

echo 创建启动快捷方式...
copy "%~dp0start-dashboard.bat" "%STARTUP_FOLDER%\WMS-Dashboard.bat" >nul 2>&1

echo.
echo ✅ 安装完成！
echo.
echo WMS Dashboard 已安装到启动文件夹：
echo %STARTUP_FOLDER%
echo.
echo 程序将在下次启动 Windows 时自动运行
echo.
echo 如需卸载，请删除启动文件夹中的以下文件：
echo - wms-dashboard-windows-amd64.exe
echo - WMS-Dashboard.bat
echo.
pause
EOF

    # 创建卸载脚本
    cat > "build/uninstall-from-startup.bat" << 'EOF'
@echo off
echo 正在从 Windows 启动文件夹卸载 WMS Dashboard...
echo.

REM 获取启动文件夹路径
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

REM 删除文件
if exist "%STARTUP_FOLDER%\wms-dashboard-windows-amd64.exe" (
    del "%STARTUP_FOLDER%\wms-dashboard-windows-amd64.exe"
    echo 已删除程序文件
)

if exist "%STARTUP_FOLDER%\WMS-Dashboard.bat" (
    del "%STARTUP_FOLDER%\WMS-Dashboard.bat"
    echo 已删除启动脚本
)

echo.
echo ✅ 卸载完成！
echo WMS Dashboard 已从启动文件夹移除
echo.
pause
EOF

    echo "   📝 已创建 Windows 脚本文件"
}

# 主要构建目标
echo "🏗️  开始构建各平台版本..."

# Windows (主要目标)
build_target "windows" "amd64" ".exe"
build_target "windows" "386" ".exe"

# Linux
build_target "linux" "amd64" ""

# macOS
build_target "darwin" "amd64" ""
build_target "darwin" "arm64" ""

# 创建README文件
cat > "build/README.md" << EOF
# WMS Dashboard v$VERSION

构建时间: $BUILD_TIME
Git提交: $GIT_COMMIT

## 文件说明

### Windows 版本
- \`wms-dashboard-windows-amd64.exe\` - Windows 64位主程序
- \`wms-dashboard-windows-386.exe\` - Windows 32位主程序
- \`start-dashboard.bat\` - 启动脚本
- \`install-to-startup.bat\` - 安装到启动文件夹
- \`uninstall-from-startup.bat\` - 从启动文件夹卸载

### 其他平台
- \`wms-dashboard-linux-amd64\` - Linux 64位版本
- \`wms-dashboard-darwin-amd64\` - macOS Intel版本
- \`wms-dashboard-darwin-arm64\` - macOS Apple Silicon版本

## 使用方法

### Windows 自动启动设置

1. **直接运行**：双击 \`start-dashboard.bat\`
2. **设置自动启动**：双击 \`install-to-startup.bat\`
3. **取消自动启动**：双击 \`uninstall-from-startup.bat\`

### 手动运行

直接运行对应平台的可执行文件，程序会：
1. 启动内嵌的Web服务器（端口8080）
2. 自动打开浏览器访问dashboard
3. 提供WMS/WCS API代理服务

### 访问地址

- 主页面: http://localhost:8080
- 健康检查: http://localhost:8080/health

### 配置说明

程序内置以下服务器地址：
- WMS服务器: http://10.20.88.14:8008
- WCS服务器: http://10.20.88.14:8009

如需修改，请重新编译程序。

## 技术特性

- 单文件部署，无需外部依赖
- 内嵌HTML资源，无需额外文件
- 自动打开浏览器（优先Chrome）
- 支持WebSocket代理（SignalR）
- 跨域请求支持
- 优雅关闭机制

## 故障排除

1. **端口冲突**：确保8080端口未被占用
2. **网络问题**：检查到WMS/WCS服务器的网络连接
3. **浏览器问题**：手动访问 http://localhost:8080
4. **防火墙**：确保防火墙允许程序网络访问

EOF

# 显示构建结果
echo ""
echo "🎉 构建完成！"
echo ""
echo "📁 构建文件位置: build/"
ls -la build/
echo ""
echo "📋 使用说明:"
echo "1. Windows用户：运行 build/start-dashboard.bat"
echo "2. 自动启动：运行 build/install-to-startup.bat"
echo "3. 其他平台：运行对应的可执行文件"
echo ""
echo "🔗 程序将在 http://localhost:8080 提供服务"