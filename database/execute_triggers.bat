@echo off
echo Criando triggers para auditoria...
echo.

set PGPASSWORD=Roberto@2007

echo Executando triggers de auditoria...
psql -h localhost -U postgres -d net_imobiliaria -f 06_create_triggers.sql -q

echo.
echo Triggers de auditoria criados!
echo.
echo FASE 1.1 - Dia 5: Concluida!
echo.
pause


