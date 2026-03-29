@echo off
chcp 65001 >nul 2>&1
title HTML 原型可视化编辑工具

echo.
echo   正在启动 HTML 原型可视化编辑工具...
echo.

:: 检查 node 是否存在
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   ❌ 未检测到 Node.js，请先安装 Node.js
    echo   下载地址: https://nodejs.org/
    pause
    exit /b 1
)

:: 进入脚本所在目录
cd /d "%~dp0"

:: 检查是否需要安装依赖
if not exist "node_modules" (
    echo   📦 首次运行，正在安装依赖...
    npm install
    echo.
)

:: 启动服务
node server.js

pause
