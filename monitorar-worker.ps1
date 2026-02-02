Write-Host "🔍 Monitorando logs do worker..." -ForegroundColor Cyan
Write-Host "Aguardando worker iniciar..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

if (Test-Path "worker_leads.log") {
    Write-Host "`n📋 Últimas 30 linhas do log:" -ForegroundColor Green
    Get-Content worker_leads.log -Tail 30
    
    Write-Host "`n✅ Worker está rodando!" -ForegroundColor Green
    Write-Host "🔍 Procurando por logs de debug (Tentando EXTERNAL)..." -ForegroundColor Cyan
    
    $debugLogs = Select-String -Path "worker_leads.log" -Pattern "Tentando EXTERNAL" -SimpleMatch
    if ($debugLogs) {
        Write-Host "✅ LOGS DE DEBUG ENCONTRADOS! Worker está usando código novo." -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Logs de debug NÃO encontrados ainda. Worker pode estar usando código antigo." -ForegroundColor Yellow
    }
}
else {
    Write-Host "❌ Arquivo worker_leads.log não encontrado!" -ForegroundColor Red
}
