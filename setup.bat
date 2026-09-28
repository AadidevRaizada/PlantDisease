@echo off
where node >nul 2>nul || (echo Node.js is required: https://nodejs.org & pause & exit /b 1)
cd /d "%~dp0app"
call npm install || (pause & exit /b 1)
if /i "%1"=="https" (call npm run dev:https) else (call npm run dev)
