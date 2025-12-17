# Script PowerShell para iniciar o servico de feed automaticamente
# Este script verifica se o servico esta rodando e o inicia se necessario

Write-Host "[*] Verificando servico de feed..." -ForegroundColor Cyan

# Obter o diretorio atual do script e navegar para o diretorio do projeto
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent $scriptPath
Set-Location $projectPath

Write-Host "[*] Diretorio do projeto: $projectPath" -ForegroundColor Gray

# Verificar se ja existe processo do feed-cron rodando
$feedProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*feed-cron-scheduler*" -or
    $_.Path -like "*feed-cron*"
}

if ($feedProcesses) {
    Write-Host "[!] Servico de feed ja esta rodando!" -ForegroundColor Yellow
    Write-Host "   Processos encontrados:" -ForegroundColor Yellow
    $feedProcesses | ForEach-Object {
        Write-Host "   - PID: $($_.Id) | Iniciado: $($_.StartTime)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "[*] Para reiniciar, pare os processos primeiro:" -ForegroundColor Cyan
    Write-Host "   Get-Process node | Stop-Process -Force" -ForegroundColor Gray
    exit 0
}

# Verificar se o Node.js esta instalado
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "[ERRO] Node.js nao encontrado! Instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Node.js encontrado: $($nodePath.Source)" -ForegroundColor Green

# Verificar se o arquivo do agendador existe
$schedulerPath = Join-Path $projectPath "scripts\feed-cron-scheduler.js"
if (-not (Test-Path $schedulerPath)) {
    Write-Host "[ERRO] Arquivo do agendador nao encontrado: $schedulerPath" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Arquivo do agendador encontrado" -ForegroundColor Green

# Verificar se o .env.local existe
$envPath = Join-Path $projectPath ".env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "[!] Arquivo .env.local nao encontrado. Criando a partir do .env..." -ForegroundColor Yellow
    if (Test-Path (Join-Path $projectPath ".env")) {
        Copy-Item (Join-Path $projectPath ".env") $envPath
        Write-Host "[OK] Arquivo .env.local criado" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] Arquivo .env nao encontrado. Configure as variaveis de ambiente primeiro." -ForegroundColor Red
        exit 1
    }
}

# Criar jobs pendentes primeiro (se necessario)
Write-Host ""
Write-Host "[*] Criando jobs de sincronizacao..." -ForegroundColor Cyan
$createJobsResult = & node scripts/create-feed-jobs.js 2>&1
Write-Host $createJobsResult

# Iniciar o agendador em background
Write-Host ""
Write-Host "[*] Iniciando agendador de feed..." -ForegroundColor Green
Write-Host "   Este processo ficara rodando em background." -ForegroundColor Gray
Write-Host "   Para parar, use: Get-Process node | Stop-Process -Force" -ForegroundColor Gray
Write-Host ""

# Iniciar processo em background usando Start-Process
$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = "node"
$processInfo.Arguments = "scripts/feed-cron-scheduler.js"
$processInfo.WorkingDirectory = $projectPath
$processInfo.UseShellExecute = $false
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.CreateNoWindow = $false

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $processInfo

# Configurar redirecionamento de saida para arquivo de log
$logPath = Join-Path $projectPath "logs"
if (-not (Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath | Out-Null
}

$logFile = Join-Path $logPath "feed-cron-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$process.StartInfo.RedirectStandardOutput = $true
$process.StartInfo.RedirectStandardError = $true

try {
    $process.Start() | Out-Null
    
    Write-Host "[OK] Servico iniciado com sucesso!" -ForegroundColor Green
    Write-Host "   PID: $($process.Id)" -ForegroundColor Gray
    Write-Host "   Log: $logFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[*] Proximos passos:" -ForegroundColor Cyan
    Write-Host "   1. O servico criara jobs a cada hora" -ForegroundColor Gray
    Write-Host "   2. Os jobs serao processados a cada 15 minutos" -ForegroundColor Gray
    Write-Host "   3. Novos conteudos aparecerao automaticamente na pagina" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[*] Para verificar o status:" -ForegroundColor Cyan
    Write-Host "   npm run feed:check" -ForegroundColor Gray
    
    # Aguardar um pouco para verificar se iniciou corretamente
    Start-Sleep -Seconds 3
    
    if (-not $process.HasExited) {
        Write-Host "[OK] Servico esta rodando corretamente!" -ForegroundColor Green
    } else {
        Write-Host "[!] Servico parou inesperadamente. Verifique o log: $logFile" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "[ERRO] Erro ao iniciar servico: $_" -ForegroundColor Red
    exit 1
}
