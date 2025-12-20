param(
  [string]$Source = "C:\\NetImobiliária\\Backup_BD\\backup_bd_0612.sql",
  [string]$DestDir = ".\\database\\backups",
  [string]$DestName = "net_imobiliaria.sql"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $Source -PathType Leaf)) {
  throw "Arquivo não encontrado: $Source"
}

New-Item -ItemType Directory -Force -Path $DestDir | Out-Null

$destPath = Join-Path $DestDir $DestName
Copy-Item -Force $Source $destPath

Write-Host "[OK] Backup copiado para: $destPath" -ForegroundColor Green
Write-Host "[*] Agora rode: powershell -ExecutionPolicy Bypass -File .\\scripts\\docker\\restore-into-container.ps1 -DumpPathInContainer /backups/$DestName" -ForegroundColor Gray


