param(
  # Banco "pré-docker" (onde estava funcionando antes)
  [string]$Host = "localhost",
  [int]$Port = 5432,
  [string]$Database = "net_imobiliaria",
  [string]$User = "postgres",
  [string]$Password = "",

  # Saída (vai para dentro do repo e será montada no container em /backups)
  [string]$OutFile = ".\\database\\backups\\net_imobiliaria.dump"
)

$ErrorActionPreference = "Stop"

Write-Host "[*] Exportando banco pré-docker via pg_dump..." -ForegroundColor Cyan

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  throw "pg_dump não encontrado no PATH. Instale o PostgreSQL client tools (ou adicione ao PATH) e tente novamente."
}

if (-not $Password) {
  Write-Host "[!] DB_PASSWORD vazio. Se o seu Postgres exige senha, passe -Password '...'." -ForegroundColor Yellow
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutFile) | Out-Null

# Usar formato custom (-Fc): melhor para restore e mais rápido/seguro
$env:PGPASSWORD = $Password

pg_dump `
  -h $Host `
  -p $Port `
  -U $User `
  -F c `
  -f $OutFile `
  $Database

Write-Host "[OK] Dump gerado em: $OutFile" -ForegroundColor Green
Write-Host "[*] Próximo passo: rode .\\scripts\\docker\\restore-into-container.ps1" -ForegroundColor Gray


