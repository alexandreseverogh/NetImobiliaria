# =============================================================================
# transfer-export.ps1
# Empacota os arquivos NAO versionados (que o git clone nao traz) para levar
# a outro computador: .env.local + public/uploads/
#
# Rode NESTA maquina (origem). Gera 'netimob-transfer.zip' no Desktop.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\transfer-export.ps1
# =============================================================================
$ErrorActionPreference = 'Stop'

# Raiz do projeto = pasta-pai deste script (scripts/ -> raiz)
$root = Split-Path $PSScriptRoot -Parent
Write-Host "Projeto: $root"

$envFile = Join-Path $root '.env.local'
$uploads = Join-Path $root 'public\uploads'
$staging = Join-Path $env:TEMP 'netimob-transfer'
$zipOut  = Join-Path ([Environment]::GetFolderPath('Desktop')) 'netimob-transfer.zip'

if (-not (Test-Path $envFile)) { throw ".env.local NAO encontrado em: $envFile" }

# Monta area de staging com a estrutura espelhada do projeto
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging -Force | Out-Null

Copy-Item $envFile (Join-Path $staging '.env.local') -Force
Write-Host "  [+] .env.local"

if (Test-Path $uploads) {
  $destPublic = Join-Path $staging 'public'
  New-Item -ItemType Directory -Path $destPublic -Force | Out-Null
  Copy-Item $uploads $destPublic -Recurse -Force
  $n = (Get-ChildItem $uploads -Recurse -File -ErrorAction SilentlyContinue).Count
  Write-Host "  [+] public/uploads ($n arquivos)"
} else {
  Write-Warning "public/uploads nao encontrado - pulando (ok se nao houver uploads)"
}

# Gera o zip preservando estrutura e dotfiles
if (Test-Path $zipOut) { Remove-Item $zipOut -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($staging, $zipOut)
Remove-Item $staging -Recurse -Force

$size = [math]::Round((Get-Item $zipOut).Length / 1MB, 2)
Write-Host ""
Write-Host "OK! Gerado: $zipOut  ($size MB)"
Write-Host "ATENCAO: o zip contem credenciais (.env.local)."
Write-Host "         NAO suba para o Git nem compartilhe publicamente."
Write-Host "Proximo passo: leve o zip ao Desktop do outro PC e rode scripts\transfer-import.ps1"
