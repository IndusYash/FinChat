@echo off

echo Stopping Node.js processes...

taskkill /F /IM node.exe

echo.
echo All backend and n8n services stopped.

pause