param(
  [string]$PostgresImage = "postgres:17-alpine",
  [string]$BackupSourcePath = "",
  [string]$BackupDestName = "remote_backup.sql",
  [string]$DumpPathInContainer = "/backups/remote_backup.sql"
)

$ErrorActionPreference = "Stop"

Write-Host "[*] Bootstrap Docker (2ª máquina): Postgres + App" -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker não encontrado. Instale o Docker Desktop e tente novamente."
}

# 1) Garantir Postgres 17 (compatível com dumps PGDMP 1.16)
$env:POSTGRES_IMAGE = $PostgresImage

Write-Host "[*] Subindo containers com POSTGRES_IMAGE=$PostgresImage ..." -ForegroundColor Cyan
docker compose up -d --build

# 2) Copiar backup para dentro do repo (opcional)
if ($BackupSourcePath) {
  Write-Host "[*] Copiando backup: $BackupSourcePath -> database/backups/$BackupDestName" -ForegroundColor Cyan
  powershell -ExecutionPolicy Bypass -File .\scripts\docker\copy-backup-from-path.ps1 `
    -Source $BackupSourcePath `
    -DestName $BackupDestName
}

# 3) Restaurar no container (se o arquivo existir)
Write-Host "[*] Verificando se o backup existe no container: $DumpPathInContainer" -ForegroundColor Cyan
$check = docker compose exec -T db sh -lc "test -f '$DumpPathInContainer' && echo OK || echo MISSING"
if ($check -match "OK") {
  Write-Host "[*] Restaurando backup no container..." -ForegroundColor Cyan
  powershell -ExecutionPolicy Bypass -File .\scripts\docker\restore-into-container.ps1 -DumpPathInContainer $DumpPathInContainer
} else {
  Write-Host "[!] Backup não encontrado no container. Coloque o arquivo em database/backups e rode o restore manualmente:" -ForegroundColor Yellow
  Write-Host "    powershell -ExecutionPolicy Bypass -File .\scripts\docker\restore-into-container.ps1 -DumpPathInContainer $DumpPathInContainer" -ForegroundColor Yellow
}

Write-Host "[OK] Bootstrap finalizado." -ForegroundColor Green
Write-Host "[*] Valide em http://localhost:3000/api/health e depois em /landpaging" -ForegroundColor Gray


