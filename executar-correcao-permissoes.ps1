# Script PowerShell para corrigir permissões
Write-Host "Corrigindo permissões do admin..." -ForegroundColor Green

# Definir variável de ambiente
$env:PGPASSWORD = "Roberto@2007"

# Executar correção
Write-Host "Executando fix-all-admin-permissions.sql..." -ForegroundColor Yellow
& psql -U postgres -d net_imobiliaria -f fix-all-admin-permissions.sql

Write-Host "`nVerificando resultado..." -ForegroundColor Green
& psql -U postgres -d net_imobiliaria -f check-permissions-simple.sql

Write-Host "`nPressione qualquer tecla para continuar..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

