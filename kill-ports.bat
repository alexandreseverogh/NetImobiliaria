@echo off
echo Derrubando todas as portas...

REM Matar todos os processos node
taskkill /F /IM node.exe 2>nul
echo Processos Node.js finalizados

REM Matar todos os processos npm  
taskkill /F /IM npm.exe 2>nul
echo Processos npm finalizados

REM Matar processos na porta 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %%a 2>nul
echo Porta 3000 liberada

REM Matar processos na porta 3001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /F /PID %%a 2>nul
echo Porta 3001 liberada

echo.
echo Aguardando 2 segundos...
timeout /t 2 /nobreak >nul

echo Iniciando servidor...
npm run dev


