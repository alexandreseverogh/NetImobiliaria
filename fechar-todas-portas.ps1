# Script PowerShell para fechar todas as portas
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    FECHANDO TODAS AS PORTAS ATIVAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "[1/4] Fechando processos Node.js..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "✅ Processos Node.js fechados" -ForegroundColor Green
} else {
    Write-Host "⚠️ Nenhum processo Node.js encontrado" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/4] Fechando processos Next.js..." -ForegroundColor Yellow
$nextProcesses = Get-Process -Name "next" -ErrorAction SilentlyContinue
if ($nextProcesses) {
    $nextProcesses | Stop-Process -Force
    Write-Host "✅ Processos Next.js fechados" -ForegroundColor Green
} else {
    Write-Host "⚠️ Nenhum processo Next.js encontrado" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/4] Fechando porta 3000 especificamente..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    $port3000 | ForEach-Object {
        $processId = $_.OwningProcess
        Write-Host "Fechando processo PID: $processId"
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
    Write-Host "✅ Porta 3000 liberada" -ForegroundColor Green
} else {
    Write-Host "⚠️ Porta 3000 já está livre" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[4/4] Fechando outras portas comuns de desenvolvimento..." -ForegroundColor Yellow
$commonPorts = @(3001, 3002, 8080)
foreach ($port in $commonPorts) {
    $portConnections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($portConnections) {
        $portConnections | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}
Write-Host "✅ Portas comuns liberadas" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "           TODAS AS PORTAS FECHADAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Agora você pode executar: npm run dev" -ForegroundColor Green
Write-Host ""
Read-Host "Pressione Enter para continuar"


