param(
  [string]$PostgresImage = "postgres:17-alpine",
  # Backup OFICIAL (schema do projeto). Se vazio, não copia do host.
  [string]$BackupSourcePath = "",
  # Nome do arquivo dentro do repo (database/backups) e dentro do container (/backups)
  [string]$BackupDestName = "schema_oficial.sql",
  [string]$DumpPathInContainer = "/backups/schema_oficial.sql",
  # Se a 2ª máquina já tiver volume antigo (ex.: PG15), use -ResetDbVolume para recriar
  [switch]$ResetDbVolume
)

$ErrorActionPreference = "Stop"

Write-Host "[*] Bootstrap Docker (2ª máquina): Postgres + App" -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker não encontrado. Instale o Docker Desktop e tente novamente."
}

# Garantir que estamos na raiz do projeto (script está em scripts/docker)
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..")
Set-Location $projectRoot
Write-Host "[*] Diretório do projeto: $projectRoot" -ForegroundColor Gray

# 1) Garantir Postgres 17 (compatível com dumps PGDMP 1.16)
$env:POSTGRES_IMAGE = $PostgresImage

if ($ResetDbVolume) {
  Write-Host "[!] ResetDbVolume ativado: removendo containers e VOLUME do banco (docker compose down -v)..." -ForegroundColor Yellow
  docker compose down -v
}

Write-Host "[*] Subindo containers (db + app + feed) com POSTGRES_IMAGE=$PostgresImage ..." -ForegroundColor Cyan
docker compose up -d --build db app feed

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
  powershell -ExecutionPolicy Bypass -File .\scripts\docker\restore-into-container.ps1 -DumpPathInContainer $DumpPathInContainer -ExpectedPgMajor 17
  # Garantir que o worker de feed está de pé após restore
  docker compose up -d feed | Out-Null
} else {
  Write-Host "[!] Backup não encontrado no container. Coloque o arquivo em database/backups e rode o restore manualmente:" -ForegroundColor Yellow
  Write-Host "    powershell -ExecutionPolicy Bypass -File .\scripts\docker\restore-into-container.ps1 -DumpPathInContainer $DumpPathInContainer -ExpectedPgMajor 17" -ForegroundColor Yellow
}

Write-Host "[OK] Bootstrap finalizado." -ForegroundColor Green
Write-Host "[*] Valide em http://localhost:3000/api/health e depois em /landpaging" -ForegroundColor Gray


