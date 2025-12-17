# 🔍 Comandos para Verificar o Agendador de Feed

## ✅ COMANDO RÁPIDO

```powershell
npm run feed:verificar-agendador
```

Ou diretamente:

```powershell
.\scripts\verificar-agendador.ps1
```

---

## 📋 O QUE O SCRIPT VERIFICA

1. **Processos Node.js rodando**
   - Quantos processos estão ativos
   - Há quanto tempo estão rodando

2. **Servidor Next.js**
   - Se está rodando na porta 3000

3. **API do Feed**
   - Se está respondendo
   - Quantos posts estão disponíveis

4. **Instruções SQL**
   - Queries para verificar no banco de dados

---

## 🔍 VERIFICAÇÃO MANUAL NO BANCO

### Verificar última coleta:

```sql
SELECT 
    nome, 
    ultima_coleta,
    CASE 
        WHEN ultima_coleta > NOW() - INTERVAL '2 hours' THEN '✅ ATIVO'
        WHEN ultima_coleta > NOW() - INTERVAL '24 hours' THEN '⚠️ PARADO HA POUCO'
        WHEN ultima_coleta IS NULL THEN '❌ NUNCA COLETOU'
        ELSE '❌ PARADO HA MUITO TEMPO'
    END as status
FROM feed.feed_fontes 
WHERE ativo = true
ORDER BY ultima_coleta DESC NULLS LAST;
```

**Interpretação:**
- ✅ `ultima_coleta` < 2 horas = Agendador funcionando
- ⚠️ `ultima_coleta` > 2 horas = Agendador parou
- ❌ `ultima_coleta` NULL = Nunca coletou

---

### Verificar jobs recentes:

```sql
SELECT 
    f.nome as fonte,
    j.status,
    j.created_at,
    j.finalizado_em,
    CASE 
        WHEN j.status = 'COMPLETED' THEN '✅ SUCESSO'
        WHEN j.status = 'FAILED' THEN '❌ FALHOU'
        WHEN j.status = 'PENDING' THEN '⏳ PENDENTE'
        WHEN j.status = 'PROCESSING' THEN '🔄 PROCESSANDO'
    END as status_descricao
FROM feed.feed_jobs j
JOIN feed.feed_fontes f ON j.fonte_fk = f.id
WHERE j.created_at > NOW() - INTERVAL '2 hours'
ORDER BY j.created_at DESC
LIMIT 20;
```

---

## 🚀 COMANDOS ÚTEIS

### Verificar processos Node.js:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Format-Table Id, ProcessName, StartTime
```

### Verificar porta 3000:

```powershell
netstat -ano | findstr :3000
```

### Testar API:

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/public/feed" | Select-Object -ExpandProperty Content
```

---

## 📊 RESUMO

**Comando principal:**
```powershell
npm run feed:verificar-agendador
```

**Se o agendador não estiver rodando:**
```powershell
npm run feed:cron
```

**Para verificar no banco:**
Execute as queries SQL acima para ver `ultima_coleta` e status dos jobs.

