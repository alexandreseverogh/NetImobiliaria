# 🚀 Como Reiniciar o Serviço de Feed

## ⚠️ PROBLEMA: Serviço Parado

Se você vê "Serviço parado - Última coleta há X horas", significa que o agendador não está rodando.

## ✅ SOLUÇÃO RÁPIDA

### Opção 1: Reiniciar Manualmente (Recomendado)

1. **Abra um novo terminal PowerShell**

2. **Navegue para o diretório do projeto:**
   ```powershell
   cd C:\NetImobiliária\net-imobiliaria
   ```

3. **Inicie o agendador:**
   ```powershell
   npm run feed:cron
   ```

4. **Deixe o terminal aberto** - O serviço precisa ficar rodando continuamente

### Opção 2: Usar Script PowerShell

Crie um arquivo `start-feed-service.ps1`:

```powershell
# start-feed-service.ps1
Set-Location "C:\NetImobiliária\net-imobiliaria"
npm run feed:cron
```

Execute:
```powershell
.\start-feed-service.ps1
```

## 🔍 VERIFICAR SE ESTÁ RODANDO

### Ver processos Node.js:
```powershell
Get-Process node -ErrorAction SilentlyContinue
```

### Verificar no banco (última coleta):
```sql
SELECT 
    nome,
    ultima_coleta,
    CASE 
        WHEN ultima_coleta > NOW() - INTERVAL '2 hours' THEN '✅ ATIVO'
        WHEN ultima_coleta > NOW() - INTERVAL '24 hours' THEN '⚠️ PARADO HA POUCO'
        ELSE '❌ PARADO HA MUITO TEMPO'
    END as status
FROM feed.feed_fontes 
WHERE ativo = true
ORDER BY ultima_coleta DESC NULLS LAST;
```

## 📋 O QUE O SERVIÇO FAZ

O agendador (`feed:cron`) executa automaticamente:

1. **A cada hora (minuto 0):** Cria novos jobs de coleta
2. **A cada 15 minutos:** Processa jobs pendentes

## ⚙️ CONFIGURAR PARA INICIAR AUTOMATICAMENTE

### Windows Task Scheduler:

1. Abra o **Agendador de Tarefas** (Task Scheduler)
2. Criar nova tarefa:
   - **Nome:** Feed Cron Service
   - **Gatilho:** Ao iniciar o computador
   - **Ação:** Iniciar programa
   - **Programa:** `C:\Program Files\nodejs\node.exe`
   - **Argumentos:** `C:\NetImobiliária\net-imobiliaria\scripts\feed-cron-scheduler.js`
   - **Diretório:** `C:\NetImobiliária\net-imobiliaria`

## 💡 DICA

**Após falta de energia ou reiniciar o computador**, você sempre precisa reiniciar o serviço manualmente, a menos que configure o Task Scheduler.

## ✅ VERIFICAÇÃO RÁPIDA

Após iniciar o serviço, aguarde alguns minutos e verifique:

1. **Na página landpaging:** O status deve mudar para "ATIVO"
2. **No banco:** `ultima_coleta` deve ser atualizado nas próximas horas

