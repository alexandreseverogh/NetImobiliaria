# Script PowerShell para derrubar todas as portas
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "        DERRUBANDO TODAS AS PORTAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "1. Fechando processos Node.js..." -ForegroundColor Yellow

# Fechar processos na porta 3000
$processes3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
foreach ($processId in $processes3000) {
    Write-Host "   Fechando processo $processId na porta 3000" -ForegroundColor Green
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

# Fechar processos na porta 3001
$processes3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
foreach ($processId in $processes3001) {
    Write-Host "   Fechando processo $processId na porta 3001" -ForegroundColor Green
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "2. Fechando todos os processos Node.js..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "   Processos Node.js finalizados" -ForegroundColor Green

Write-Host ""
Write-Host "3. Fechando processos npm..." -ForegroundColor Yellow
Get-Process -Name "npm" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "   Processos npm finalizados" -ForegroundColor Green

Write-Host ""
Write-Host "4. Verificando portas abertas..." -ForegroundColor Yellow
$portas3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$portas3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

if ($portas3000) {
    Write-Host "   Porta 3000 ainda está aberta" -ForegroundColor Red
} else {
    Write-Host "   Porta 3000 liberada" -ForegroundColor Green
}

if ($portas3001) {
    Write-Host "   Porta 3001 ainda está aberta" -ForegroundColor Red
} else {
    Write-Host "   Porta 3001 liberada" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "        TODAS AS PORTAS DERRUBADAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Aguarde 3 segundos antes de iniciar o servidor..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Iniciando servidor..." -ForegroundColor Green
npm run dev
