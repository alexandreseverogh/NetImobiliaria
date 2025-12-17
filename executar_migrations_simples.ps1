# Executar Migrations de Slugs - Versao Simples (sem emojis)

Write-Host ""
Write-Host "========================================"
Write-Host "  EXECUTANDO MIGRATIONS DE SLUGS"
Write-Host "========================================"
Write-Host ""

$env:PGPASSWORD = 'Roberto@2007'

# MIGRATION 1: Invalidar Tokens
Write-Host "MIGRATION 1: Invalidando tokens..."

psql -U postgres -d net_imobiliaria -c "UPDATE user_sessions SET revoked = true WHERE revoked = false;"
psql -U postgres -d net_imobiliaria -c "UPDATE user_2fa_codes SET used = true WHERE used = false;"

Write-Host "OK - MIGRATION 1 concluida"
Write-Host ""

# MIGRATION 2: Melhorar funcao normalize_to_slug
Write-Host "MIGRATION 2: Melhorando funcao normalize_to_slug..."

psql -U postgres -d net_imobiliaria -f "database/migrations/022_melhorar_normalize_slug.sql"

Write-Host "OK - MIGRATION 2 concluida"
Write-Host ""

# VERIFICACAO FINAL
Write-Host "Verificando slugs na tabela..."

$count = psql -U postgres -d net_imobiliaria -t -A -c "SELECT COUNT(*) FROM system_features WHERE slug LIKE '%-de-%' OR slug LIKE '%-do-%' OR slug LIKE '%-da-%';"
$count = $count.Trim()

Write-Host "Slugs com artigos: $count"

if ($count -eq "0") {
    Write-Host "OK - Nenhum slug problematico!"
} else {
    Write-Host "AVISO - Ainda existem $count slug(s) com artigos"
}

Write-Host ""
Write-Host "========================================"
Write-Host "  MIGRATIONS CONCLUIDAS"
Write-Host "========================================"
Write-Host ""



