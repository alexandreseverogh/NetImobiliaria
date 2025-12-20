param(
  [string]$Service = "db",
  [string]$Database = "net_imobiliaria",
  [string]$User = "postgres",
  [string]$DumpPathInContainer = "/backups/backup_net_imobiliaria_utf8.sql"
)

$ErrorActionPreference = "Stop"

Write-Host "[*] Restaurando banco no container Postgres (service=$Service, db=$Database)..." -ForegroundColor Cyan
Write-Host "[!] ATENÇÃO: isso vai aplicar o dump no banco '$Database' do container." -ForegroundColor Yellow
Write-Host "    Se o banco estiver vazio (como no primeiro start), é seguro. Se já tiver dados, pode sobrescrever/duplicar." -ForegroundColor Yellow

# Verificar se o container está de pé
docker compose ps | Out-Null

# Verificar se dump está acessível dentro do container
$check = docker compose exec -T $Service sh -lc "test -f '$DumpPathInContainer' && echo OK || echo MISSING"
if ($check -notmatch "OK") {
  throw "Dump não encontrado dentro do container em '$DumpPathInContainer'. Verifique o bind-mount no docker-compose.yml."
}

Write-Host "[*] Aplicando dump via psql (isso pode demorar)..." -ForegroundColor Cyan
docker compose exec -T $Service psql -U $User -d $Database -v ON_ERROR_STOP=1 -f $DumpPathInContainer

Write-Host "[OK] Restore concluído." -ForegroundColor Green
Write-Host "[*] Dica: valide em http://localhost:3000/api/public/imoveis/destaque?tipo_destaque=DV&estado=PE&cidade=Recife" -ForegroundColor Gray


