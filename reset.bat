@echo off
cls
echo ========================================
echo           RESET COMPLETO
echo ========================================

echo Fechando processos...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npm.exe >nul 2>&1

echo Aguardando...
timeout /t 2 /nobreak >nul

echo Iniciando servidor...
npm run dev


