# Script para fazer backup CORRETO do banco de dados
# Execute este script no COMPUTADOR DE ORIGEM (onde funciona)

param(
    [string]$Password = "Roberto@2007",
    [string]$OutputPath = "C:\NetImobiliária\backup_completo.sql"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BACKUP DO BANCO DE DADOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se PostgreSQL está rodando
Write-Host "Verificando se PostgreSQL esta rodando..." -ForegroundColor Yellow
$pgService = Get-Service | Where-Object { $_.Name -like "*postgres*" -and $_.Status -eq "Running" }
if (-not $pgService) {
    Write-Host "ERRO: PostgreSQL nao esta rodando!" -ForegroundColor Red
    Write-Host "Inicie o servico PostgreSQL antes de continuar." -ForegroundColor Yellow
    exit 1
}
Write-Host "OK: PostgreSQL esta rodando" -ForegroundColor Green
Write-Host ""

# Verificar se banco existe
Write-Host "Verificando se banco 'net_imobiliaria' existe..." -ForegroundColor Yellow
$env:PGPASSWORD = $Password
$dbExists = psql -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='net_imobiliaria'" 2>&1

if (-not $dbExists -or $dbExists -match "error|ERRO") {
    Write-Host "ERRO: Banco de dados 'net_imobiliaria' nao encontrado!" -ForegroundColor Red
    Write-Host "Verifique se o nome do banco esta correto." -ForegroundColor Yellow
    exit 1
}
Write-Host "OK: Banco de dados encontrado" -ForegroundColor Green
Write-Host ""

# Verificar se arquivo de destino ja existe
if (Test-Path $OutputPath) {
    $backupAntigo = Get-Item $OutputPath
    Write-Host "ATENCAO: Arquivo de destino ja existe!" -ForegroundColor Yellow
    Write-Host "  Arquivo: $($backupAntigo.Name)" -ForegroundColor White
    Write-Host "  Tamanho: $([math]::Round($backupAntigo.Length/1MB,2)) MB" -ForegroundColor White
    Write-Host "  Data: $($backupAntigo.LastWriteTime)" -ForegroundColor White
    Write-Host ""
    
    $confirmar = Read-Host "Deseja substituir o arquivo existente? (S/N)"
    if ($confirmar -ne "S" -and $confirmar -ne "s") {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $OutputPath = "C:\NetImobiliária\backup_completo_$timestamp.sql"
        Write-Host "Novo arquivo sera criado: $OutputPath" -ForegroundColor Cyan
    } else {
        Write-Host "Arquivo existente sera substituido." -ForegroundColor Yellow
    }
    Write-Host ""
}

# Fazer backup
Write-Host "Iniciando backup do banco de dados..." -ForegroundColor Yellow
Write-Host "  Banco: net_imobiliaria" -ForegroundColor White
Write-Host "  Arquivo: $OutputPath" -ForegroundColor White
Write-Host ""
Write-Host "Isso pode levar varios minutos dependendo do tamanho do banco..." -ForegroundColor Cyan
Write-Host ""

$inicio = Get-Date

# IMPORTANTE: --verbose ANTES de -f, nunca depois!
# OU remova --verbose completamente
try {
    # Opcao 1: Com --verbose (antes de -f)
    pg_dump -U postgres -h localhost -d net_imobiliaria --verbose -F p -f $OutputPath
    
    # Se der erro, tentar sem --verbose
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Tentando sem --verbose..." -ForegroundColor Yellow
        pg_dump -U postgres -h localhost -d net_imobiliaria -F p -f $OutputPath
    }
    
    if ($LASTEXITCODE -eq 0) {
        $fim = Get-Date
        $tempoDecorrido = ($fim - $inicio).TotalSeconds
        
        $fileInfo = Get-Item $OutputPath
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  BACKUP CONCLUIDO COM SUCESSO!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Arquivo criado: $($fileInfo.FullName)" -ForegroundColor Cyan
        Write-Host "Tamanho: $([math]::Round($fileInfo.Length/1MB,2)) MB" -ForegroundColor Cyan
        Write-Host "Tempo decorrido: $([math]::Round($tempoDecorrido,2)) segundos" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
        Write-Host "1. Transfira este arquivo para o computador de destino" -ForegroundColor White
        Write-Host "2. Execute o script restaurar-backup.ps1 no computador de destino" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "ERRO: Falha ao criar backup!" -ForegroundColor Red
        Write-Host "Verifique:" -ForegroundColor Yellow
        Write-Host "  - PostgreSQL esta rodando?" -ForegroundColor White
        Write-Host "  - Banco de dados existe?" -ForegroundColor White
        Write-Host "  - Senha esta correta?" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

