# 🔍 Como Verificar se o Serviço de Feed Está Rodando

## ⚡ Após Falta de Energia

Quando o computador desliga, o serviço de agendamento (`feed-cron-scheduler.js`) para de rodar. Você precisa reiniciá-lo manualmente.

---

## 🔍 VERIFICAR SE ESTÁ RODANDO

### Método 1: PowerShell (Windows)

```powershell
# Ver processos Node.js rodando
Get-Process node -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, StartTime, CPU

# Ver processos específicos do feed-cron
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*feed-cron*" }
```

### Método 2: Verificar Porta/Processo

```powershell
# Ver todos os processos Node.js
netstat -ano | findstr :3000

# Ver processos com "feed" no nome
Get-Process | Where-Object { $_.ProcessName -like "*node*" } | Format-Table Id, ProcessName, StartTime
```

### Método 3: Verificar no Banco de Dados

```sql
-- Ver últimos jobs processados (últimas 2 horas)
SELECT 
    j.id,
    f.nome as fonte,
    j.status,
    j.created_at,
    j.finalizado_em,
    j.log_erro
FROM feed.feed_jobs j
JOIN feed.feed_fontes f ON j.fonte_fk = f.id
WHERE j.created_at > NOW() - INTERVAL '2 hours'
ORDER BY j.created_at DESC;

-- Ver fontes e última coleta
SELECT 
    nome,
    ultima_coleta,
    status_coleta,
    CASE 
        WHEN ultima_coleta > NOW() - INTERVAL '2 hours' THEN '✅ Ativo'
        WHEN ultima_coleta > NOW() - INTERVAL '24 hours' THEN '⚠️ Parado há pouco'
        ELSE '❌ Parado há muito tempo'
    END as status
FROM feed.feed_fontes
WHERE ativo = true
ORDER BY ultima_coleta DESC NULLS LAST;
```

**Interpretação:**
- ✅ `ultima_coleta` recente (< 2 horas) = Serviço está rodando
- ⚠️ `ultima_coleta` antiga (> 2 horas) = Serviço parou
- ❌ `ultima_coleta` NULL ou muito antiga = Serviço nunca rodou ou parou há muito tempo

---

## 🚀 REINICIAR O SERVIÇO

### Opção 1: Reiniciar Manualmente

```powershell
# 1. Parar processos Node.js relacionados ao feed (se houver)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Navegar para o diretório do projeto
cd C:\NetImobiliária\net-imobiliaria

# 3. Iniciar o agendador
npm run feed:cron
```

### Opção 2: Script PowerShell (Criar arquivo `start-feed-service.ps1`)

```powershell
# start-feed-service.ps1
Write-Host "🔄 Iniciando serviço de feed..." -ForegroundColor Cyan

# Navegar para o diretório
Set-Location "C:\NetImobiliária\net-imobiliaria"

# Verificar se já está rodando
$processes = Get-Process node -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "⚠️ Processos Node.js encontrados. Parando..." -ForegroundColor Yellow
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Iniciar serviço
Write-Host "✅ Iniciando agendador de feed..." -ForegroundColor Green
npm run feed:cron
```

**Usar:**
```powershell
.\start-feed-service.ps1
```

---

## 📊 VERIFICAR SE ESTÁ FUNCIONANDO

### 1. Ver Logs do Serviço

O serviço mostra logs no terminal:
```
✅ [Cron] Job #X processado (Y itens)
```

### 2. Verificar no Banco

```sql
-- Ver jobs processados nas últimas horas
SELECT 
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as sucesso,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as falhas,
    MAX(finalizado_em) as ultimo_processamento
FROM feed.feed_jobs
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Ver últimas coletas por fonte
SELECT 
    f.nome,
    f.ultima_coleta,
    COUNT(c.id) as total_conteudos,
    MAX(c.data_publicacao) as conteudo_mais_recente
FROM feed.feed_fontes f
LEFT JOIN feed.feed_conteudos c ON f.id = c.fonte_fk
WHERE f.ativo = true
GROUP BY f.id, f.nome, f.ultima_coleta
ORDER BY f.ultima_coleta DESC NULLS LAST;
```

### 3. Testar Processamento Manual

```powershell
# Criar jobs
npm run feed:create-jobs

# Processar um job
curl http://localhost:3000/api/cron/feed-sync
```

---

## 🔄 CONFIGURAR PARA INICIAR AUTOMATICAMENTE

### Opção 1: Task Scheduler (Windows)

1. Abrir **Agendador de Tarefas** (Task Scheduler)
2. Criar nova tarefa:
   - **Nome:** Feed Cron Service
   - **Gatilho:** Ao iniciar o computador
   - **Ação:** Iniciar programa
   - **Programa:** `C:\Program Files\nodejs\node.exe`
   - **Argumentos:** `C:\NetImobiliária\net-imobiliaria\scripts\feed-cron-scheduler.js`
   - **Diretório:** `C:\NetImobiliária\net-imobiliaria`

### Opção 2: Serviço Windows (Mais Avançado)

Usar `node-windows` para criar um serviço Windows:

```bash
npm install -g node-windows
```

Criar script de instalação do serviço (mais complexo, requer configuração adicional).

---

## 📋 CHECKLIST DE VERIFICAÇÃO

Após falta de energia:

- [ ] Verificar processos Node.js rodando
- [ ] Verificar última coleta no banco (`ultima_coleta`)
- [ ] Verificar jobs processados recentemente
- [ ] Reiniciar serviço se necessário (`npm run feed:cron`)
- [ ] Verificar logs do serviço
- [ ] Testar processamento manual

---

## 🎯 RESUMO RÁPIDO

**Verificar se está rodando:**
```powershell
Get-Process node -ErrorAction SilentlyContinue
```

**Verificar no banco:**
```sql
SELECT nome, ultima_coleta FROM feed.feed_fontes WHERE ativo = true;
```

**Reiniciar:**
```powershell
npm run feed:cron
```

**Se `ultima_coleta` estiver NULL ou muito antiga (> 2 horas) = Serviço parou, precisa reiniciar!**

