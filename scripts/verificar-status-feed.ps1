# Script para verificar status do serviço de feed
Write-Host "=== Verificação do Serviço de Feed ===" -ForegroundColor Cyan
Write-Host ""

# Verificar processos Node.js
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "[OK] Processos Node.js encontrados: $($nodeProcesses.Count)" -ForegroundColor Green
    $nodeProcesses | ForEach-Object {
        Write-Host "   PID: $($_.Id) | Iniciado: $($_.StartTime)" -ForegroundColor Gray
    }
} else {
    Write-Host "[ERRO] Nenhum processo Node.js encontrado!" -ForegroundColor Red
    Write-Host "   O serviço de feed NÃO está rodando." -ForegroundColor Yellow
}

Write-Host ""

# Verificar tarefa agendada
$task = Get-ScheduledTask -TaskName "NetImobiliaria_FeedService" -ErrorAction SilentlyContinue

if ($task) {
    Write-Host "[OK] Tarefa agendada encontrada!" -ForegroundColor Green
    Write-Host "   Nome: $($task.TaskName)" -ForegroundColor Gray
    Write-Host "   Estado: $($task.State)" -ForegroundColor Gray
    
    $taskInfo = Get-ScheduledTaskInfo -TaskName "NetImobiliaria_FeedService"
    Write-Host "   Última execução: $($taskInfo.LastRunTime)" -ForegroundColor Gray
    Write-Host "   Próxima execução: $($taskInfo.NextRunTime)" -ForegroundColor Gray
} else {
    Write-Host "[AVISO] Tarefa agendada NÃO encontrada!" -ForegroundColor Yellow
    Write-Host "   Configure com: npm run feed:configurar-auto" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== Próximos Passos ===" -ForegroundColor Cyan
Write-Host "1. Se serviço não está rodando: npm run feed:iniciar" -ForegroundColor Gray
Write-Host "2. Para configurar automático: npm run feed:configurar-auto (como Admin)" -ForegroundColor Gray
Write-Host "3. Para verificar no banco:" -ForegroundColor Gray
Write-Host "   SELECT MAX(ultima_coleta) FROM feed.feed_fontes WHERE ativo = true;" -ForegroundColor DarkGray



