@echo off

echo Starting Backend Server...
start cmd /k "node server.js"

timeout /t 5

echo Starting n8n...
start cmd /k "n8n"

timeout /t 10

echo Opening Browser...
start http://localhost:5678

echo Project Started Successfully