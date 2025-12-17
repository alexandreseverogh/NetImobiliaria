# Script para verificar se o agendador de feed está funcionando
# Execute: .\scripts\verificar-agendador.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFICACAO DO AGENDADOR DE FEED" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar processos Node.js rodando
Write-Host "1. PROCESSOS NODE.JS RODANDO:" -ForegroundColor Yellow
$processes = Get-Process node -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "   OK: $($processes.Count) processo(s) Node.js encontrado(s)" -ForegroundColor Green
    $processes | ForEach-Object {
        $runtime = (Get-Date) - $_.StartTime
        Write-Host "   - PID: $($_.Id) | Rodando ha: $($runtime.Hours)h $($runtime.Minutes)m" -ForegroundColor Gray
    }
} else {
    Write-Host "   ERRO: Nenhum processo Node.js encontrado" -ForegroundColor Red
    Write-Host "   Execute: npm run feed:cron" -ForegroundColor Yellow
}

Write-Host ""

# 2. Verificar servidor Next.js
Write-Host "2. SERVIDOR NEXT.JS:" -ForegroundColor Yellow
$port3000 = netstat -ano | findstr :3000
if ($port3000) {
    Write-Host "   OK: Servidor rodando na porta 3000" -ForegroundColor Green
} else {
    Write-Host "   AVISO: Servidor nao esta rodando" -ForegroundColor Yellow
    Write-Host "   Execute: npm run dev" -ForegroundColor Gray
}

Write-Host ""

# 3. Verificar API do feed
Write-Host "3. API DO FEED:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/public/feed" -Method GET -TimeoutSec 5 -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    if ($data.success) {
        Write-Host "   OK: API funcionando" -ForegroundColor Green
        Write-Host "   Total de posts disponiveis: $($data.data.Count)" -ForegroundColor Gray
    } else {
        Write-Host "   AVISO: API retornou erro" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ERRO: Nao foi possivel conectar a API" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""

# 4. Instrucoes para verificar no banco
Write-Host "4. VERIFICACAO NO BANCO DE DADOS:" -ForegroundColor Yellow
Write-Host "   Execute estas queries SQL para verificar:" -ForegroundColor White
Write-Host ""
Write-Host "   -- Ver ultima coleta de cada fonte:" -ForegroundColor Gray
Write-Host "   SELECT nome, ultima_coleta," -ForegroundColor DarkGray
Write-Host "          CASE WHEN ultima_coleta > NOW() - INTERVAL '2 hours' THEN 'ATIVO'" -ForegroundColor DarkGray
Write-Host "               WHEN ultima_coleta IS NULL THEN 'NUNCA COLETOU'" -ForegroundColor DarkGray
Write-Host "               ELSE 'PARADO' END as status" -ForegroundColor DarkGray
Write-Host "   FROM feed.feed_fontes WHERE ativo = true;" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   -- Ver jobs recentes:" -ForegroundColor Gray
Write-Host "   SELECT f.nome, j.status, j.created_at, j.finalizado_em" -ForegroundColor DarkGray
Write-Host "   FROM feed.feed_jobs j" -ForegroundColor DarkGray
Write-Host "   JOIN feed.feed_fontes f ON j.fonte_fk = f.id" -ForegroundColor DarkGray
Write-Host "   WHERE j.created_at > NOW() - INTERVAL '2 hours'" -ForegroundColor DarkGray
Write-Host "   ORDER BY j.created_at DESC;" -ForegroundColor DarkGray

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMO:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($processes) {
    Write-Host "Status: AGENDADOR PROVAVELMENTE RODANDO" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para confirmar, verifique:" -ForegroundColor White
    Write-Host "1. Se ha um terminal com 'npm run feed:cron' rodando" -ForegroundColor Gray
    Write-Host "2. Se ha jobs sendo processados no banco (query acima)" -ForegroundColor Gray
    Write-Host "3. Se 'ultima_coleta' esta sendo atualizada nas fontes" -ForegroundColor Gray
} else {
    Write-Host "Status: AGENDADOR NAO ESTA RODANDO" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para iniciar:" -ForegroundColor White
    Write-Host "1. Execute: npm run feed:cron" -ForegroundColor Yellow
    Write-Host "2. Deixe rodando em background" -ForegroundColor Gray
}

Write-Host ""

