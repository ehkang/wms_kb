@echo off
chcp 65001 >nul 2>&1
title WMS Dashboard

echo.
echo ========================================
echo  WMS Dashboard 启动中...
echo  (兼容 Windows 7/8/10/11)
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

REM 检查Windows版本兼容性
echo 检查系统兼容性...
ver | find "Windows" >nul
if errorlevel 1 (
    echo 警告: 未检测到Windows系统
)

echo 启动程序: %BINARY%
echo.
echo 注意: 本程序已优化兼容Windows 7及以上系统
echo.

REM 启动程序
"%BINARY%"

REM 如果程序异常退出，显示详细错误信息
if errorlevel 1 (
    echo.
    echo 程序异常退出，错误代码: %errorlevel%
    echo.
    echo 可能的原因:
    echo 1. 系统版本太旧 (Windows 7以下不支持)
    echo 2. 缺少必要的运行库
    echo 3. 端口被占用或防火墙阻止
    echo 4. 网络连接问题
    echo.
    pause
)
