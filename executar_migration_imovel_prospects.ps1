# Executar migration para criar tabela imovel_prospects

Write-Host ""
Write-Host "========================================"
Write-Host "  CRIANDO TABELA imovel_prospects"
Write-Host "========================================"
Write-Host ""

$env:PGPASSWORD = 'Roberto@2007'

Write-Host "Executando script SQL..."
psql -U postgres -d net_imobiliaria -f "database/migrations/create_imovel_prospects.sql"

Write-Host ""
Write-Host "========================================"
Write-Host "  MIGRATION CONCLUIDA"
Write-Host "========================================"
Write-Host ""









