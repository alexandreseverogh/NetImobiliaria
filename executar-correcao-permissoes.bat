@echo off
echo Corrigindo permissões do admin...
set PGPASSWORD=Roberto@2007
psql -U postgres -d net_imobiliaria -f fix-all-admin-permissions.sql
echo.
echo Verificando resultado...
psql -U postgres -d net_imobiliaria -f check-permissions-simple.sql
pause
