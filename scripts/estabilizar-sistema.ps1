# Script de Estabilizacao do Sistema
# Mata processos node travados, valida banco de dados e inicia o sistema limpo.

Write-Host "[1/4] Parando processos Node.js antigos..." -ForegroundColor Yellow
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "[OK] Processos antigos encerrados." -ForegroundColor Green

Write-Host "`n[2/4] Validando conexao com Banco de Dados..." -ForegroundColor Cyan

# Executar script de validacao dedicado
node scripts/validate-db-connection.js
if ($LASTEXITCODE -eq 0) {
  Write-Host "[OK] Conexao com banco de dados validada." -ForegroundColor Green
}
else {
  Write-Host "[ERRO] Falha na validacao do banco de dados." -ForegroundColor Red
  Write-Host "[DICA] Verifique se o Docker esta rodando e se a porta 15432 esta aberta."
  exit 1
}

Write-Host "`n[3/4] Iniciando Workers em Background..." -ForegroundColor Cyan

# Remove arquivos de log antigos para limpar a visao
Remove-Item "server_debug.log" -ErrorAction SilentlyContinue
Remove-Item "worker_feed.log" -ErrorAction SilentlyContinue
Remove-Item "worker_leads.log" -ErrorAction SilentlyContinue
Remove-Item "worker_transbordo.log" -ErrorAction SilentlyContinue

# Inicia Lead Worker
$leadWorker = Start-Process node -ArgumentList "scripts/lead-router-sla-worker.js" -PassThru -RedirectStandardOutput "worker_leads.log" -RedirectStandardError "worker_leads.err.log" -WindowStyle Hidden
Write-Host "[OK] Lead Router Worker iniciado (PID: $($leadWorker.Id))" -ForegroundColor Green

# Inicia Feed Scheduler
$feedWorker = Start-Process node -ArgumentList "scripts/feed-cron-scheduler.js" -PassThru -RedirectStandardOutput "worker_feed.log" -RedirectStandardError "worker_feed.err.log" -WindowStyle Hidden
Write-Host "[OK] Feed Scheduler iniciado (PID: $($feedWorker.Id))" -ForegroundColor Green

# Inicia Transbordo Scheduler
$transWorker = Start-Process node -ArgumentList "scripts/transbordo-scheduler.js" -PassThru -RedirectStandardOutput "worker_transbordo.log" -RedirectStandardError "worker_transbordo.err.log" -WindowStyle Hidden
Write-Host "[OK] Transbordo Scheduler iniciado (PID: $($transWorker.Id))" -ForegroundColor Green

Write-Host "`n[4/4] Iniciando Servidor Next.js..." -ForegroundColor Cyan
Write-Host "[INFO] O servidor abrira nesta janela. Pressione Ctrl+C para parar TUDO." -ForegroundColor Gray
Write-Host "[INFO] Logs dos workers estao em: worker_leads.log, worker_feed.log"

npm run dev -- -p 3001
