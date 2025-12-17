@echo off
echo Liberando porta 3000...
taskkill /f /im node.exe
echo Porta liberada!
timeout /t 2 /nobreak >nul
echo Iniciando servidor...
npm run dev
