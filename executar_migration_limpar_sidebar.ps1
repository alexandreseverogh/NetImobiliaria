# Executar migration 027 (limpar sidebar_menu_items)

Write-Host ""
Write-Host "Executando migration 027 (Migrar roles_required)..."
Write-Host ""

$env:PGPASSWORD = 'Roberto@2007'

psql -U postgres -d net_imobiliaria -f "database/migrations/027_migrar_roles_required_CORRIGIDO.sql"

Write-Host ""
Write-Host "Migration concluida!"
Write-Host ""

