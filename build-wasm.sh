#!/bin/bash

# 构建Go WASM模块的脚本

echo "🚀 开始构建Go WASM模块..."

# 设置环境变量
export GOOS=js
export GOARCH=wasm

# 构建WASM文件
echo "📦 编译WASM模块..."
go build -o wasm/main.wasm wasm/main.go

if [ $? -eq 0 ]; then
    echo "✅ WASM模块编译成功: wasm/main.wasm"
else
    echo "❌ WASM模块编译失败"
    exit 1
fi

# 复制WASM支持文件
echo "📋 复制wasm_exec.js..."
# 尝试多个可能的路径
if [ -f "$(go env GOROOT)/misc/wasm/wasm_exec.js" ]; then
    cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" wasm/
elif [ -f "$(go env GOROOT)/lib/wasm/wasm_exec.js" ]; then
    cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" wasm/
else
    # 手动搜索
    WASM_EXEC=$(find /snap/go -name "wasm_exec.js" 2>/dev/null | head -1)
    if [ -n "$WASM_EXEC" ]; then
        cp "$WASM_EXEC" wasm/
    else
        echo "❌ 找不到wasm_exec.js文件"
        exit 1
    fi
fi

if [ $? -eq 0 ]; then
    echo "✅ wasm_exec.js 复制成功"
else
    echo "❌ wasm_exec.js 复制失败"
    exit 1
fi

# 显示文件大小
echo "📊 WASM文件信息:"
ls -lh wasm/main.wasm
ls -lh wasm/wasm_exec.js

echo ""
echo "🎉 WASM模块构建完成！"
echo "📁 文件位置:"
echo "   - WASM模块: wasm/main.wasm"
echo "   - 支持脚本: wasm/wasm_exec.js"
echo "   - HTML页面: wasm/dashboard.html"
echo ""
echo "🔧 使用方法:"
echo "1. 启动测试服务器: python3 -m http.server 8080 -d wasm"
echo "2. 访问: http://localhost:8080/dashboard.html"
echo "3. 调用API函数: goWasmRequest(method, url, data)"