# Corrigir funcao normalize_to_slug

Write-Host ""
Write-Host "Executando correcao da funcao normalize_to_slug..."
Write-Host ""

$env:PGPASSWORD = 'Roberto@2007'

psql -U postgres -d net_imobiliaria -f "database/migrations/022_melhorar_normalize_slug_corrigido.sql"

Write-Host ""
Write-Host "OK - Funcao corrigida!"
Write-Host ""



