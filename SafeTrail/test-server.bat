@echo off
echo ========================================
echo SafeTrail Server Test & Launcher
echo ========================================
echo.

echo [1/3] Checking if server is running...
timeout /t 1 /nobreak >nul
netstat -an | findstr ":3000" >nul
if %errorlevel% == 0 (
    echo ✅ Server is running on port 3000
) else (
    echo ❌ Server is NOT running
    echo Starting server...
    start "SafeTrail Server" cmd /k "node server.js"
    timeout /t 3 /nobreak >nul
)

echo.
echo [2/3] Testing server connection...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 3; Write-Host '✅ Server responding: Status' $response.StatusCode } catch { Write-Host '❌ Connection failed:' $_.Exception.Message }"

echo.
echo [3/3] Opening browser...
timeout /t 1 /nobreak >nul
start http://localhost:3000
start http://127.0.0.1:3000

echo.
echo ========================================
echo Test complete!
echo If browser shows error, try:
echo   1. Hard refresh: Ctrl+Shift+R
echo   2. Try: http://127.0.0.1:3000
echo   3. Check Windows Firewall settings
echo ========================================
pause

