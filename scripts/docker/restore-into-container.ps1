param(
  [string]$DbService = "db",
  [string]$AppService = "app",
  [string]$Database = "net_imobiliaria",
  [string]$User = "postgres",
  [string]$DumpPathInContainer = "/backups/net_imobiliaria.dump"
)

$ErrorActionPreference = "Stop"

Write-Host "[*] Restaurando dump no Postgres do docker-compose..." -ForegroundColor Cyan
Write-Host "[!] Isso vai recriar o banco '$Database' dentro do container." -ForegroundColor Yellow

# Parar app para liberar conexões
Write-Host "[*] Parando app..." -ForegroundColor Cyan
docker compose stop $AppService | Out-Null

# Verificar dump dentro do container
$check = docker compose exec -T $DbService sh -lc "test -f '$DumpPathInContainer' && echo OK || echo MISSING"
if ($check -notmatch "OK") {
  throw "Dump não encontrado em '$DumpPathInContainer'. Coloque o arquivo em .\\database\\backups\\ e confirme o nome."
}

Write-Host "[*] Drop/Create database..." -ForegroundColor Cyan

# DROP DATABASE não pode rodar dentro de transaction; executar comandos separados.
docker compose exec -T $DbService psql -U $User -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$Database';" | Out-Null
docker compose exec -T $DbService psql -U $User -d postgres -c "DROP DATABASE IF EXISTS $Database;" | Out-Null
docker compose exec -T $DbService psql -U $User -d postgres -c "CREATE DATABASE $Database;" | Out-Null

Write-Host "[*] Executando pg_restore (formato custom)..." -ForegroundColor Cyan
# Autodetect: alguns backups vêm com extensão .sql mas são dumps "custom" (PGDMP).
$header = docker compose exec -T $DbService sh -lc "head -c 5 '$DumpPathInContainer' 2>/dev/null || true"
$looksLikeCustom = $header -like "PGDMP*"
$looksLikeSqlByExt = $DumpPathInContainer.ToLower().EndsWith(".sql")

if ($looksLikeCustom) {
  Write-Host "[*] Header PGDMP detectado -> usando pg_restore ..." -ForegroundColor Cyan
  docker compose exec -T $DbService pg_restore -U $User -d $Database --clean --if-exists --no-owner --no-privileges $DumpPathInContainer
} elseif ($looksLikeSqlByExt) {
  Write-Host "[*] Dump .sql (texto) detectado -> usando psql -f ..." -ForegroundColor Cyan
  docker compose exec -T $DbService psql -U $User -d $Database -v ON_ERROR_STOP=1 -f $DumpPathInContainer
} else {
  Write-Host "[*] Extensão não é .sql e header não é PGDMP -> tentando pg_restore por padrão ..." -ForegroundColor Yellow
  docker compose exec -T $DbService pg_restore -U $User -d $Database --clean --if-exists --no-owner --no-privileges $DumpPathInContainer
}

Write-Host "[*] Subindo app..." -ForegroundColor Cyan
docker compose up -d $AppService | Out-Null

Write-Host "[OK] Restore concluído." -ForegroundColor Green
Write-Host "[*] Valide em http://localhost:3000/api/health e na landing page." -ForegroundColor Gray


