@echo off
echo Fechando processos na porta 3000...

REM Fechar processos Node.js na porta 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo Fechando processo %%a
    taskkill /PID %%a /F
)

REM Aguardar um momento
timeout /t 2 /nobreak >nul

echo Iniciando servidor...
npm run dev


