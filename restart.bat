@echo off
echo Fechando processos Node.js...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npm.exe >nul 2>&1
echo Processos finalizados!

echo Aguardando 2 segundos...
timeout /t 2 /nobreak >nul

echo Iniciando servidor...
npm run dev


