# Executar migration de dashboards

Write-Host ""
Write-Host "Executando migration 025 (Dashboards)..."
Write-Host ""

$env:PGPASSWORD = 'Roberto@2007'

psql -U postgres -d net_imobiliaria -f "database/migrations/025_add_dashboards_routes.sql"

Write-Host ""
Write-Host "Migration concluida!"
Write-Host ""



