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
