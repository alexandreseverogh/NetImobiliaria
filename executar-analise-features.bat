@echo off
echo Analisando system_features...
set PGPASSWORD=Roberto@2007
psql -U postgres -d net_imobiliaria -f analyze-system-features-complete.sql
pause

