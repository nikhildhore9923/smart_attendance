@echo off
setlocal enabledelayedexpansion

set "PROJECT_ROOT=%~dp0"
echo ===================================================
echo      SmartAttend - Unified Startup Script
echo ===================================================
echo Project Root: %PROJECT_ROOT%
echo.

:: 1. MySQL Check
echo [1/4] Checking MySQL availability...
powershell -NoProfile -Command "try { $client = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 3306); $client.Close(); exit 0 } catch { exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] MySQL is not responding on localhost:3306.
    echo Please ensure your MySQL server is running before starting SmartAttend.
    pause
    exit /b 1
)
echo [OK] MySQL is available.
echo.

:: 2. AI Service
echo [2/4] Checking AI Service (Port 8000)...
curl.exe -s -f -o NUL http://localhost:8000/health
if %ERRORLEVEL% EQU 0 (
    echo [OK] AI Service is already running and healthy.
) else (
    netstat -ano | findstr LISTENING | findstr :8000 >nul
    if !ERRORLEVEL! EQU 0 (
        echo [ERROR] Port 8000 is occupied, but AI Service is NOT responding to /health.
        echo Conflicting PIDs:
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr :8000') do (
            echo PID: %%a
            tasklist /FI "PID eq %%a"
        )
        echo Please terminate the conflicting process and try again.
        pause
        exit /b 1
    )
    echo Starting AI Service...
    start "SmartAttend - AI Service" /D "%PROJECT_ROOT%ai-service" cmd /k "(if exist ..\.venv\Scripts\activate (call ..\.venv\Scripts\activate) else if exist .venv\Scripts\activate (call .venv\Scripts\activate)) & echo Starting Uvicorn... & python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
    
    set "AI_READY=0"
    for /L %%i in (1,1,20) do (
        curl.exe -s -f -o NUL http://localhost:8000/health
        if !ERRORLEVEL! EQU 0 (
            set "AI_READY=1"
            goto :AiReady
        )
        echo Waiting for AI Service to initialize ^(Attempt %%i/20^)...
        timeout /t 1 /nobreak >nul
    )
    :AiReady
    if !AI_READY! EQU 0 (
        echo [ERROR] AI Service failed to start or respond in time. Check the AI Service window for errors.
        pause
        exit /b 1
    )
    echo [OK] AI Service started successfully.
)
echo.

:: 3. Node.js Backend
echo [3/4] Checking Node.js Backend (Port 5000)...
curl.exe -s -f -o NUL http://localhost:5000/api/health
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js Backend is already running and healthy.
) else (
    netstat -ano | findstr LISTENING | findstr :5000 >nul
    if !ERRORLEVEL! EQU 0 (
        echo [ERROR] Port 5000 is occupied, but Node.js Backend is NOT responding to /api/health.
        echo Conflicting PIDs:
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr :5000') do (
            echo PID: %%a
            tasklist /FI "PID eq %%a"
        )
        echo Please terminate the conflicting process and try again.
        pause
        exit /b 1
    )
    echo Starting Node.js Backend...
    start "SmartAttend - Backend" /D "%PROJECT_ROOT%backend" cmd /k "echo Starting Node Server... & node src/server.js"
    
    set "BE_READY=0"
    for /L %%i in (1,1,20) do (
        curl.exe -s -f -o NUL http://localhost:5000/api/health
        if !ERRORLEVEL! EQU 0 (
            set "BE_READY=1"
            goto :BeReady
        )
        echo Waiting for Node.js Backend to initialize ^(Attempt %%i/20^)...
        timeout /t 1 /nobreak >nul
    )
    :BeReady
    if !BE_READY! EQU 0 (
        echo [ERROR] Node.js Backend failed to start or respond in time. Check the Backend window for errors.
        pause
        exit /b 1
    )
    echo [OK] Node.js Backend started successfully.
)
echo.

:: 4. React Frontend
echo [4/4] Checking React Frontend (Port 5173)...
curl.exe -s -f -o NUL http://localhost:5173/
if %ERRORLEVEL% EQU 0 (
    echo [OK] React Frontend is already running.
) else (
    netstat -ano | findstr LISTENING | findstr :5173 >nul
    if !ERRORLEVEL! EQU 0 (
        echo [ERROR] Port 5173 is occupied, but React Frontend is NOT responding.
        echo Conflicting PIDs:
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr :5173') do (
            echo PID: %%a
            tasklist /FI "PID eq %%a"
        )
        echo Please terminate the conflicting process and try again.
        pause
        exit /b 1
    )
    echo Starting React Frontend...
    start "SmartAttend - Frontend" /D "%PROJECT_ROOT%frontend" cmd /k "echo Starting Vite... & npm run dev"
    
    set "FE_READY=0"
    for /L %%i in (1,1,20) do (
        curl.exe -s -f -o NUL http://localhost:5173/
        if !ERRORLEVEL! EQU 0 (
            set "FE_READY=1"
            goto :FeReady
        )
        echo Waiting for React Frontend to compile and start ^(Attempt %%i/20^)...
        timeout /t 1 /nobreak >nul
    )
    :FeReady
    if !FE_READY! EQU 0 (
        echo [ERROR] React Frontend failed to start or respond in time. Check the Frontend window for errors.
        pause
        exit /b 1
    )
    echo [OK] React Frontend started successfully.
)
echo.

:: Open browser
echo [INFO] All services verified. Opening default browser to http://localhost:5173...
start http://localhost:5173

echo.
echo ===================================================
echo All services are running and healthy!
echo.
echo - AI Service  : http://localhost:8000
echo - Backend API : http://localhost:5000
echo - Frontend    : http://localhost:5173
echo.
echo To stop the system, close the newly opened
echo command prompt windows.
echo ===================================================
pause

