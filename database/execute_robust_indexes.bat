@echo off
echo Criando indices para Sistema Robusto...
echo.

set PGPASSWORD=Roberto@2007

echo Executando indices do sistema robusto...
psql -h localhost -U postgres -d net_imobiliaria -f 05_create_indexes_final.sql -q

echo.
echo Indices do sistema robusto criados!
echo.
echo FASE 1.1 - Dia 4: Concluida!
echo.
pause


