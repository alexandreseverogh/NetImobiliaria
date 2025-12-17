@echo off
echo ========================================
echo    FECHANDO TODAS AS PORTAS ATIVAS
echo ========================================

echo.
echo [1/4] Fechando processos Node.js...
taskkill /f /im node.exe 2>nul
if %errorlevel% == 0 (
    echo ✅ Processos Node.js fechados
) else (
    echo ⚠️ Nenhum processo Node.js encontrado
)

echo.
echo [2/4] Fechando processos Next.js...
taskkill /f /im next.exe 2>nul
if %errorlevel% == 0 (
    echo ✅ Processos Next.js fechados
) else (
    echo ⚠️ Nenhum processo Next.js encontrado
)

echo.
echo [3/4] Fechando porta 3000 especificamente...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo Fechando processo PID: %%a
    taskkill /f /pid %%a 2>nul
)
echo ✅ Porta 3000 liberada

echo.
echo [4/4] Fechando outras portas comuns de desenvolvimento...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    taskkill /f /pid %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002') do (
    taskkill /f /pid %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do (
    taskkill /f /pid %%a 2>nul
)
echo ✅ Portas comuns liberadas

echo.
echo ========================================
echo           TODAS AS PORTAS FECHADAS
echo ========================================
echo.
echo ✅ Agora você pode executar: npm run dev
echo.
pause


