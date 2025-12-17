# Executar migration 026 (sidebar menu route)

Write-Host ""
Write-Host "Executando migration 026 (Sidebar Menu Route)..."
Write-Host ""

$env:PGPASSWORD = 'Roberto@2007'

psql -U postgres -d net_imobiliaria -f "database/migrations/026_add_sidebar_menu_route.sql"

Write-Host ""
Write-Host "Migration concluida!"
Write-Host ""



