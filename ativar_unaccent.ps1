# Ativar extensao unaccent e criar funcao normalize_to_slug

Write-Host ""
Write-Host "Ativando extensao unaccent e criando funcao..."
Write-Host ""

$env:PGPASSWORD = 'Roberto@2007'

psql -U postgres -d net_imobiliaria -f "database/migrations/024_ativar_unaccent_e_criar_funcao.sql"

Write-Host ""
Write-Host "Concluido!"
Write-Host ""



