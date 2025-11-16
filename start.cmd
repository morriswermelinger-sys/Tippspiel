@echo off
IF NOT EXIST node_modules (echo Installing deps... & npm install)
IF NOT EXIST .env (echo ADMIN_KEY=change-me-please> .env & echo PORT=3001>> .env)
echo Server: http://localhost:3001
node server.js
pause
