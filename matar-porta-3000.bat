@echo off
echo Procurando processos na porta 3000...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Matando processo %%a
    taskkill /f /pid %%a
)

echo Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

echo Tentando iniciar servidor na porta 3000...
npm run dev


