param(
  [string]$DbService = "db",
  [string]$Database = "net_imobiliaria",
  [string]$User = "postgres",
  # IMPORTANTE: esta pasta deve conter apenas migrations IDPOTENTES e "forward-only"
  # (seguras para rodar em qualquer ambiente/container).
  [string]$MigrationsDir = "database/migrations_docker"
)

$ErrorActionPreference = "Stop"

# Garantir que estamos na raiz do projeto (script está em scripts/docker)
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..")
Set-Location $projectRoot

if (-not (Test-Path $MigrationsDir)) {
  throw "Diretório de migrations não encontrado: $MigrationsDir"
}

Write-Host "[*] Aplicando migrations no Postgres do docker-compose (service=$DbService, db=$Database)..." -ForegroundColor Cyan
Write-Host "[*] Pasta de migrations: $MigrationsDir" -ForegroundColor Gray

# Criar tabela de controle (idempotente)
docker compose exec -T $DbService psql -U $User -d $Database -v ON_ERROR_STOP=1 -c @"
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename   text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
"@ | Out-Null

# IMPORTANTE:
# - Para manter ambientes 100% idênticos, padronize migrations com prefixo numérico:
#   001_..., 002_...
# - Este runner aplica SOMENTE arquivos que seguem esse padrão.
$files = Get-ChildItem -Path $MigrationsDir -Filter "*.sql" -File |
  Where-Object { $_.Name -match '^\d{3}_.+\.sql$' } |
  Sort-Object Name

if (-not $files -or $files.Count -eq 0) {
  Write-Host "[!] Nenhuma migration numerada encontrada em $MigrationsDir (padrão ###_nome.sql)." -ForegroundColor Yellow
  exit 0
}

$applied = 0
$skipped = 0

foreach ($file in $files) {
  $name = $file.Name

  $already = docker compose exec -T $DbService psql -U $User -d $Database -tAc "SELECT 1 FROM public.schema_migrations WHERE filename = '$name' LIMIT 1;"
  $already = ($already | Out-String).Trim()

  if ($already -eq "1") {
    $skipped++
    continue
  }

  Write-Host "[*] Aplicando migration: $name" -ForegroundColor Cyan

  # Copiar para dentro do container e executar via -f para garantir exit code confiável
  $tmpPath = "/tmp/$name"
  docker compose cp $file.FullName "$($DbService):$tmpPath" | Out-Null

  docker compose exec -T $DbService psql -U $User -d $Database -v ON_ERROR_STOP=1 -f $tmpPath | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao aplicar migration $name (psql exit code $LASTEXITCODE)."
  }

  docker compose exec -T $DbService psql -U $User -d $Database -v ON_ERROR_STOP=1 -c "INSERT INTO public.schema_migrations(filename) VALUES ('$name') ON CONFLICT (filename) DO NOTHING;" | Out-Null
  docker compose exec -T $DbService sh -lc "rm -f '$tmpPath' || true" | Out-Null
  $applied++
}

Write-Host "[OK] Migrations aplicadas: $applied | já aplicadas (skip): $skipped" -ForegroundColor Green


