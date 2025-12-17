@echo off
REM 🚀 Script de Instalação Automatizada - Net Imobiliária (Windows)
REM Este script instala e configura automaticamente a aplicação

echo.
echo 🏠 Net Imobiliária - Instalação Automatizada
echo ==============================================
echo.

REM Verificar se Node.js está instalado
echo [INFO] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js não encontrado. Instale Node.js 18+ primeiro.
    echo [INFO] Download: https://nodejs.org/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [SUCCESS] Node.js encontrado: %NODE_VERSION%
)

REM Verificar se PostgreSQL está instalado
echo [INFO] Verificando PostgreSQL...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PostgreSQL não encontrado. Instale PostgreSQL 15+ primeiro.
    echo [INFO] Download: https://www.postgresql.org/download/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('psql --version') do set PSQL_VERSION=%%i
    echo [SUCCESS] PostgreSQL encontrado: %PSQL_VERSION%
)

REM Verificar se Git está instalado
echo [INFO] Verificando Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git não encontrado. Instale Git primeiro.
    echo [INFO] Download: https://git-scm.com/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('git --version') do set GIT_VERSION=%%i
    echo [SUCCESS] Git encontrado: %GIT_VERSION%
)

REM Instalar dependências
echo [INFO] Instalando dependências do Node.js...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Falha ao instalar dependências
    pause
    exit /b 1
)
echo [SUCCESS] Dependências instaladas com sucesso!

REM Configurar banco de dados
echo [INFO] Configurando banco de dados...

REM Verificar se o banco já existe
psql -U postgres -lqt | findstr "net_imobiliaria" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Banco 'net_imobiliaria' já existe. Pulando criação...
) else (
    echo [INFO] Criando banco de dados...
    psql -U postgres -c "CREATE DATABASE net_imobiliaria;"
    if %errorlevel% neq 0 (
        echo [ERROR] Falha ao criar banco de dados
        pause
        exit /b 1
    )
    echo [SUCCESS] Banco de dados criado!
)

REM Executar scripts SQL
echo [INFO] Executando scripts SQL...
psql -U postgres -d net_imobiliaria -f database/schema.sql
if %errorlevel% neq 0 (
    echo [ERROR] Falha ao executar schema.sql
    pause
    exit /b 1
)

psql -U postgres -d net_imobiliaria -f database/seed.sql
if %errorlevel% neq 0 (
    echo [ERROR] Falha ao executar seed.sql
    pause
    exit /b 1
)
echo [SUCCESS] Scripts SQL executados com sucesso!

REM Configurar variáveis de ambiente
echo [INFO] Configurando variáveis de ambiente...

if exist ".env.local" (
    echo [WARNING] Arquivo .env.local já existe. Fazendo backup...
    copy .env.local .env.local.backup >nul
)

REM Gerar senhas seguras (usando PowerShell)
echo [INFO] Gerando senhas seguras...
for /f "tokens=*" %%i in ('powershell -Command "[System.Web.Security.Membership]::GeneratePassword(25, 5)"') do set DB_PASSWORD=%%i
for /f "tokens=*" %%i in ('powershell -Command "[System.Web.Security.Membership]::GeneratePassword(64, 10)"') do set JWT_SECRET=%%i

REM Criar arquivo .env.local
(
echo # ===========================================
echo # CONFIGURAÇÕES DO BANCO DE DADOS
echo # ===========================================
echo POSTGRES_HOST=localhost
echo POSTGRES_PORT=5432
echo POSTGRES_DB=net_imobiliaria
echo POSTGRES_USER=postgres
echo POSTGRES_PASSWORD=%DB_PASSWORD%
echo.
echo # ===========================================
echo # CONFIGURAÇÕES JWT
echo # ===========================================
echo JWT_SECRET=%JWT_SECRET%
echo JWT_ACCESS_EXPIRES_IN=24h
echo JWT_REFRESH_EXPIRES_IN=7d
echo.
echo # ===========================================
echo # CONFIGURAÇÕES DE SEGURANÇA
echo # ===========================================
echo RATE_LIMIT_WINDOW_MS=900000
echo RATE_LIMIT_MAX_REQUESTS=100
echo.
echo # ===========================================
echo # CONFIGURAÇÕES DA APLICAÇÃO
echo # ===========================================
echo NODE_ENV=development
echo NEXT_PUBLIC_APP_URL=http://localhost:3000
) > .env.local

echo [SUCCESS] Arquivo .env.local criado com senhas seguras!
echo [WARNING] IMPORTANTE: Anote a senha do banco: %DB_PASSWORD%

REM Testar instalação
echo [INFO] Testando instalação...
echo [INFO] Iniciando servidor de teste...

REM Iniciar servidor em background
start /B npm run dev >nul 2>&1
set SERVER_PID=%!

REM Aguardar servidor iniciar
timeout /t 5 /nobreak >nul

REM Testar endpoint
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Servidor funcionando corretamente!
) else (
    echo [WARNING] Servidor pode não estar funcionando. Verifique manualmente.
)

REM Parar servidor de teste
taskkill /F /PID %SERVER_PID% >nul 2>&1

echo.
echo [SUCCESS] 🎉 Instalação concluída com sucesso!
echo.
echo [INFO] Para iniciar a aplicação:
echo [INFO]   npm run dev
echo.
echo [INFO] Acesse: http://localhost:3000
echo [INFO] Login: admin / admin123
echo.
echo [WARNING] IMPORTANTE: Anote as credenciais geradas no arquivo .env.local
echo.
pause
