@echo off
echo Debugando permissões com SQL...
set PGPASSWORD=Roberto@2007
psql -U postgres -d net_imobiliaria -f debug-permissions-sql.sql
pause

