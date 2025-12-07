@echo off
echo Opening SafeTrail in your browser...
echo.
echo Trying multiple methods...
echo.

REM Method 1: Default browser with localhost
start http://localhost:3000

REM Method 2: Default browser with 127.0.0.1
timeout /t 1 /nobreak >nul
start http://127.0.0.1:3000

REM Method 3: Try with Edge explicitly
timeout /t 1 /nobreak >nul
start msedge http://localhost:3000

echo.
echo Browser windows should have opened!
echo.
echo If you still see connection errors:
echo   1. Wait 2-3 seconds for server to fully start
echo   2. Press Ctrl+Shift+R to hard refresh
echo   3. Check if server is running: netstat -an ^| findstr ":3000"
echo.
pause

