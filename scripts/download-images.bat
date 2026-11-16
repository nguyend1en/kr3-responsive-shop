@echo off
rem Double-click: download product photos into images\products
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0download-images.ps1"
echo.
pause
