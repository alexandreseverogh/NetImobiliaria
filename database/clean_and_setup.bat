@echo off
echo Limpando e recriando banco de dados...
echo.

set PGPASSWORD=Roberto@2007

echo Removendo tabelas existentes...
psql -h localhost -U postgres -d net_imobiliaria -c "DROP TABLE IF EXISTS audit_2fa_logs, email_logs, email_templates, email_settings, audit_logs, role_permissions, permissions, system_features, user_role_assignments, user_roles, login_attempts, user_sessions, user_2fa_codes, user_2fa_config, users CASCADE;" -q

echo Criando tabelas...
psql -h localhost -U postgres -d net_imobiliaria -f 01_create_tables.sql -q

if %ERRORLEVEL% EQU 0 (
    echo Tabelas criadas com sucesso!
) else (
    echo Erro ao criar tabelas!
    pause
    exit /b 1
)

echo.
echo Inserindo dados iniciais...
psql -h localhost -U postgres -d net_imobiliaria -f 02_seed_initial_data.sql -q

if %ERRORLEVEL% EQU 0 (
    echo Dados iniciais inseridos com sucesso!
) else (
    echo Erro ao inserir dados iniciais!
    pause
    exit /b 1
)

echo.
echo Setup concluido com sucesso!
echo.
pause


