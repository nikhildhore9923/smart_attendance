@echo off
setlocal

set "PROJECT_ROOT=%~dp0"
echo %PROJECT_ROOT%

echo Test checking...
netstat -ano | findstr :8000 >nul
if %ERRORLEVEL% equ 0 goto SkipAI

echo [1/3] Starting AI Service (FastAPI) on port 8000...
start "SmartAttend - AI Service" /D "%PROJECT_ROOT%ai-service" cmd /k "echo Hello & exit"

:SkipAI
echo AI skipped or started.
