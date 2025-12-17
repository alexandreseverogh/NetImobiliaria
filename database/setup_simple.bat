@echo off
echo Configurando banco de dados...
echo.

set PGPASSWORD=Roberto@2007

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
echo Setup concluido!
echo.
pause


