# Script para verificar se o servico de feed esta rodando
# Execute: .\scripts\verificar-servico-feed.ps1

Write-Host ""
Write-Host "Verificando servico de feed..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar processos Node.js
Write-Host "Processos Node.js rodando:" -ForegroundColor Yellow
$processes = Get-Process node -ErrorAction SilentlyContinue
if ($processes) {
    $processes | Format-Table Id, ProcessName, StartTime, @{Label="Tempo Rodando"; Expression={(Get-Date) - $_.StartTime}} -AutoSize
    Write-Host "OK: Processos Node.js encontrados" -ForegroundColor Green
} else {
    Write-Host "ERRO: Nenhum processo Node.js encontrado" -ForegroundColor Red
}

# 2. Verificar se o servidor Next.js esta rodando
Write-Host ""
Write-Host "Verificando servidor Next.js (porta 3000):" -ForegroundColor Yellow
$port3000 = netstat -ano | findstr :3000
if ($port3000) {
    Write-Host "OK: Servidor Next.js esta rodando na porta 3000" -ForegroundColor Green
} else {
    Write-Host "AVISO: Servidor Next.js nao esta rodando" -ForegroundColor Yellow
    Write-Host "   Execute: npm run dev" -ForegroundColor Gray
}

# 3. Verificar API do feed
Write-Host ""
Write-Host "Testando API do feed:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/public/feed" -Method GET -TimeoutSec 5 -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    if ($data.success) {
        Write-Host "OK: API do feed esta funcionando" -ForegroundColor Green
        Write-Host "   Total de posts: $($data.data.Count)" -ForegroundColor Gray
        if ($data.data.Count -eq 0) {
            Write-Host "   AVISO: Nenhum post encontrado. Verifique se o servico de coleta esta rodando." -ForegroundColor Yellow
        }
    } else {
        Write-Host "AVISO: API retornou erro: $($data.error)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERRO: Nao foi possivel conectar a API" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Gray
}

# 4. Verificar ultima coleta no banco (se tiver acesso)
Write-Host ""
Write-Host "Para verificar ultima coleta no banco, execute:" -ForegroundColor Cyan
Write-Host "   SELECT nome, ultima_coleta FROM feed.feed_fontes WHERE ativo = true;" -ForegroundColor Gray

# 5. Instrucoes
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "   1. Se o servico nao esta rodando, execute: npm run feed:cron" -ForegroundColor White
Write-Host "   2. Se o servidor nao esta rodando, execute: npm run dev" -ForegroundColor White
Write-Host "   3. Para criar jobs: npm run feed:create-jobs" -ForegroundColor White
Write-Host ""
