# Correcao FINAL da funcao normalize_to_slug

Write-Host ""
Write-Host "Executando correcao FINAL (DROP + CREATE)..."
Write-Host ""

$env:PGPASSWORD = 'Roberto@2007'

psql -U postgres -d net_imobiliaria -f "database/migrations/023_fix_normalize_slug_final.sql"

Write-Host ""
Write-Host "Concluido!"
Write-Host ""



