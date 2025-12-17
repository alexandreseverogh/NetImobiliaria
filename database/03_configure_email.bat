@echo off
echo Configurando settings de email no banco...
echo.

set PGPASSWORD=Roberto@2007

echo Atualizando configurações de email...
psql -h localhost -U postgres -d net_imobiliaria -c "UPDATE email_settings SET smtp_host = 'smtp.gmail.com', smtp_port = 587, smtp_secure = false, smtp_user = 'seu_email@gmail.com', smtp_password = 'sua_senha_de_app_aqui', from_email = 'seu_email@gmail.com', from_name = 'Net Imobiliária' WHERE id = 1;" -q

if %ERRORLEVEL% EQU 0 (
    echo Configurações de email atualizadas com sucesso!
) else (
    echo Erro ao atualizar configurações de email!
    pause
    exit /b 1
)

echo.
echo Configuração concluída!
echo.
echo IMPORTANTE: Configure seu email Gmail no arquivo .env.local
echo 1. Copie env.local.example para .env.local
echo 2. Substitua 'seu_email@gmail.com' pelo seu email
echo 3. Gere uma senha de app: https://myaccount.google.com/apppasswords
echo 4. Substitua 'sua_senha_de_app_aqui' pela senha gerada
echo.
pause


