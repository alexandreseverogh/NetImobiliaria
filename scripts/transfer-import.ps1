# =============================================================================
# transfer-import.ps1
# Restaura no OUTRO computador os arquivos que o git clone nao traz.
# Pre-requisitos: projeto ja clonado + 'netimob-transfer.zip' no Desktop.
#
# Uso (de dentro do projeto clonado):
#   powershell -ExecutionPolicy Bypass -File scripts\transfer-import.ps1
# =============================================================================
$ErrorActionPreference = 'Stop'

# Raiz do projeto = pasta-pai deste script (vem junto no clone)
$root = Split-Path $PSScriptRoot -Parent
Write-Host "Projeto: $root"

$zip = Join-Path ([Environment]::GetFolderPath('Desktop')) 'netimob-transfer.zip'
if (-not (Test-Path $zip)) { throw "Zip nao encontrado no Desktop: $zip" }

$tmp = Join-Path $env:TEMP 'netimob-extract'
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $tmp)

# Copia o conteudo (.env.local + public/uploads) por cima da raiz do projeto
Copy-Item (Join-Path $tmp '*') $root -Recurse -Force
Remove-Item $tmp -Recurse -Force

# Validacao
$envOk = Test-Path (Join-Path $root '.env.local')
Write-Host ""
if ($envOk) {
  Write-Host "OK! .env.local restaurado."
} else {
  Write-Warning ".env.local NAO foi restaurado - verifique o conteudo do zip."
}
if (Test-Path (Join-Path $root 'public\uploads')) {
  $n = (Get-ChildItem (Join-Path $root 'public\uploads') -Recurse -File -ErrorAction SilentlyContinue).Count
  Write-Host "OK! public/uploads restaurado ($n arquivos)."
}
Write-Host "Pronto. Agora: npm install  e  npm run dev"
