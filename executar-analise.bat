@echo off
echo Analisando as 180 permissões...
PGPASSWORD=Roberto@2007 psql -U postgres -d net_imobiliaria -f analyze-permissions-count.sql
pause

