@echo off
echo ========================================
echo        DERRUBANDO TODAS AS PORTAS
echo ========================================

echo.
echo 1. Fechando processos Node.js...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo    Fechando processo %%a na porta 3000
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    echo    Fechando processo %%a na porta 3001
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5432') do (
    echo    Fechando processo %%a na porta 5432 (PostgreSQL)
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo 2. Fechando todos os processos node.exe...
taskkill /IM node.exe /F >nul 2>&1
echo    Processos Node.js finalizados

echo.
echo 3. Fechando processos npm...
taskkill /IM npm.exe /F >nul 2>&1
echo    Processos npm finalizados

echo.
echo 4. Fechando processos next...
taskkill /IM next.exe /F >nul 2>&1
echo    Processos Next.js finalizados

echo.
echo 5. Verificando portas abertas...
netstat -ano | findstr ":3000"
netstat -ano | findstr ":3001"
netstat -ano | findstr ":5432"

echo.
echo ========================================
echo        TODAS AS PORTAS DERRUBADAS
echo ========================================
echo.
echo Aguarde 3 segundos antes de iniciar o servidor...
timeout /t 3 /nobreak >nul

echo Iniciando servidor...
npm run dev


