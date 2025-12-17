@echo off
echo Criando indices de performance...
echo.

set PGPASSWORD=Roberto@2007

echo Executando script de indices...
psql -h localhost -U postgres -d net_imobiliaria -f 05_create_indexes_corrected.sql -q

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Indices criados com sucesso!
) else (
    echo.
    echo Alguns indices ja existiam, continuando...
)

echo.
echo FASE 1.1 - Dia 4: Concluida!
echo.
pause


