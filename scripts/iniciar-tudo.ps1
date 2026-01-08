# Script PowerShell para iniciar servidor Next.js e servico de feed juntos
# Este script inicia ambos os processos em janelas separadas

Write-Host "[*] Iniciando servidor Next.js e servico de feed..." -ForegroundColor Cyan

# Obter o diretorio atual do script e navegar para o diretorio do projeto
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent $scriptPath
Set-Location $projectPath

Write-Host "[*] Diretorio do projeto: $projectPath" -ForegroundColor Gray

# Verificar se Node.js esta instalado
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "[ERRO] Node.js nao encontrado! Instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se a porta 3000 já está em uso (Next.js)
$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue

if ($port3000) {
    $pid3000 = $port3000.OwningProcess
    Write-Host "[!] A porta 3000 já está em uso pelo PID $pid3000" -ForegroundColor Yellow
    
    # Tentar descobrir o nome do processo
    try {
        $proc = Get-Process -Id $pid3000 -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "   Processo: $($proc.ProcessName) (Id: $($proc.Id))" -ForegroundColor Gray
        }
    } catch {}

    Write-Host ""
    Write-Host "[*] Deseja parar o processo da porta 3000 para liberar o servidor? (S/N)" -ForegroundColor Cyan
    $response = Read-Host
    if ($response -eq 'S' -or $response -eq 's') {
        Stop-Process -Id $pid3000 -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "[OK] Processo da porta 3000 encerrado." -ForegroundColor Green
    } else {
        Write-Host "[!] Continuando sem liberar a porta (pode falhar)..." -ForegroundColor Yellow
    }
}

# Verificar se ja existe processo do feed-cron rodando
$feedProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*feed-cron-scheduler*"
}

if ($feedProcesses) {
    Write-Host "[!] Servico de feed ja esta rodando!" -ForegroundColor Yellow
    Write-Host "   PIDs encontrados: $($feedProcesses.Id -join ', ')" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[*] Deseja parar os processos existentes? (S/N)" -ForegroundColor Cyan
    $response = Read-Host
    if ($response -eq 'S' -or $response -eq 's') {
        $feedProcesses | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Host "[OK] Processos parados." -ForegroundColor Green
    } else {
        Write-Host "[!] Continuando sem parar processos existentes..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[*] Iniciando servico de feed em background..." -ForegroundColor Cyan
# Iniciar feed-cron em nova janela do PowerShell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; npm run feed:cron" -WindowStyle Minimized

Write-Host "[OK] Servico de feed iniciado (janela minimizada)" -ForegroundColor Green

Write-Host ""
Write-Host "[*] Iniciando servico de transbordo em background..." -ForegroundColor Cyan
# Iniciar transbordo-cron em nova janela do PowerShell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; npm run transbordo:cron" -WindowStyle Minimized

Write-Host "[OK] Servico de transbordo iniciado (janela minimizada)" -ForegroundColor Green

Write-Host ""
Write-Host "[*] Iniciando servidor Next.js..." -ForegroundColor Cyan
Write-Host "[*] Esta janela ficara aberta mostrando os logs do servidor." -ForegroundColor Gray
Write-Host ""

# Iniciar Next.js na janela atual (esta ficara aberta)
npm run dev






