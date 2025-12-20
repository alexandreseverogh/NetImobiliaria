# 🔍 DIAGNÓSTICO: Feed Não Está Rodando Automaticamente
## Net Imobiliária - Solução Passo a Passo

**Data:** 2025-01-24  
**Status:** 🔧 Diagnóstico e Solução

---

## 🎯 **PROBLEMA IDENTIFICADO**

O serviço de feed precisa estar **rodando continuamente** para coletar conteúdos automaticamente. Se ele não está rodando, os feeds não serão coletados.

---

## 🔍 **PASSO 1: DIAGNOSTICAR O PROBLEMA**

### **1.1. Verificar se o Serviço Está Rodando**

**No PowerShell:**
```powershell
# Verificar processos Node.js relacionados ao feed
Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*feed-cron-scheduler*"
} | Format-Table Id, ProcessName, StartTime, @{Label="CommandLine";Expression={$_.CommandLine}}
```

**Resultado Esperado:**
- ✅ Se mostrar processos = Serviço está rodando
- ❌ Se não mostrar nada = Serviço NÃO está rodando

### **1.2. Verificar no Banco de Dados**

**No PostgreSQL ou pgAdmin:**
```sql
-- Ver última coleta de cada fonte
SELECT 
    nome, 
    ultima_coleta,
    intervalo_minutos,
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
- ✅ `ultima_coleta` < 2 horas = Serviço funcionando
- ⚠️ `ultima_coleta` > 2 horas = Serviço parou
- ❌ `ultima_coleta` NULL = Nunca coletou

### **1.3. Verificar Tarefa Agendada no Windows**

**No PowerShell (como Administrador):**
```powershell
# Verificar se a tarefa agendada existe
Get-ScheduledTask -TaskName "NetImobiliaria_FeedService" -ErrorAction SilentlyContinue
```

**Resultado Esperado:**
- ✅ Se mostrar tarefa = Tarefa agendada existe
- ❌ Se não mostrar nada = Tarefa NÃO foi configurada

---

## ✅ **PASSO 2: SOLUÇÃO IMEDIATA (Iniciar Agora)**

### **Opção A: Iniciar Manualmente (Rápido)**

**No PowerShell:**
```powershell
# Navegar para o diretório do projeto
cd C:\NetImobiliária\net-imobiliaria

# Iniciar o serviço
npm run feed:iniciar
```

**Ou diretamente:**
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/iniciar-servico-feed.ps1
```

**⚠️ IMPORTANTE:** Deixe o terminal aberto! O serviço precisa ficar rodando continuamente.

### **Opção B: Iniciar em Background (Recomendado)**

**No PowerShell:**
```powershell
cd C:\NetImobiliária\net-imobiliaria

# Iniciar em background
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File ./scripts/iniciar-servico-feed.ps1" -WindowStyle Minimized
```

---

## 🔧 **PASSO 3: CONFIGURAR INÍCIO AUTOMÁTICO**

### **3.1. Configurar Tarefa Agendada no Windows**

**No PowerShell (como Administrador):**
```powershell
# Navegar para o diretório do projeto
cd C:\NetImobiliária\net-imobiliaria

# Configurar início automático
npm run feed:configurar-auto
```

**Ou diretamente:**
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/configurar-inicio-automatico.ps1
```

**⚠️ IMPORTANTE:** Execute como Administrador!

**Como executar como Administrador:**
1. Feche o PowerShell atual
2. Clique com botão direito no PowerShell
3. Selecione "Executar como Administrador"
4. Execute o comando novamente

### **3.2. Verificar Tarefa Criada**

**No PowerShell:**
```powershell
# Ver detalhes da tarefa
Get-ScheduledTask -TaskName "NetImobiliaria_FeedService" | Format-List *

# Verificar se está habilitada
(Get-ScheduledTask -TaskName "NetImobiliaria_FeedService").State
```

**Resultado Esperado:**
- ✅ `State = Ready` = Tarefa pronta para executar
- ❌ `State = Disabled` = Tarefa desabilitada (habilitar manualmente)

### **3.3. Testar Tarefa Agendada**

**No PowerShell:**
```powershell
# Executar a tarefa manualmente para testar
Start-ScheduledTask -TaskName "NetImobiliaria_FeedService"

# Aguardar alguns segundos e verificar se iniciou
Start-Sleep -Seconds 5
Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*feed-cron-scheduler*"
}
```

---

## 🐛 **PASSO 4: RESOLVER PROBLEMAS COMUNS**

### **Problema 1: Script Não Encontrado**

**Sintoma:**
```
[ERRO] Script não encontrado: ...
```

**Solução:**
```powershell
# Verificar se os arquivos existem
Test-Path ".\scripts\iniciar-servico-feed.ps1"
Test-Path ".\scripts\feed-cron-scheduler.js"

# Se não existirem, verificar se está no diretório correto
cd C:\NetImobiliária\net-imobiliaria
```

### **Problema 2: Node.js Não Encontrado**

**Sintoma:**
```
[ERRO] Node.js não encontrado!
```

**Solução:**
```powershell
# Verificar se Node.js está instalado
node --version
npm --version

# Se não estiver instalado, instalar Node.js
# Baixar de: https://nodejs.org/
```

### **Problema 3: Erro de Permissão**

**Sintoma:**
```
[ERRO] Erro ao criar tarefa: Access Denied
```

**Solução:**
- ✅ Executar PowerShell como Administrador
- ✅ Verificar se usuário tem permissões de administrador

### **Problema 4: Serviço Para Após Algum Tempo**

**Sintoma:**
- Serviço inicia mas para depois de algumas horas

**Solução:**
```powershell
# Verificar logs do serviço
Get-Content ".\logs\feed-cron-*.log" -Tail 50

# Verificar se há erros no banco de dados
# Verificar conexão com banco no .env.local
```

### **Problema 5: Tarefa Agendada Não Executa**

**Sintoma:**
- Tarefa existe mas não inicia automaticamente

**Solução:**
```powershell
# Verificar configurações da tarefa
Get-ScheduledTask -TaskName "NetImobiliaria_FeedService" | Get-ScheduledTaskInfo

# Verificar histórico de execução
Get-ScheduledTask -TaskName "NetImobiliaria_FeedService" | Get-ScheduledTaskInfo | Format-List *

# Habilitar tarefa se estiver desabilitada
Enable-ScheduledTask -TaskName "NetImobiliaria_FeedService"
```

---

## 📋 **PASSO 5: VERIFICAÇÃO FINAL**

### **Checklist de Verificação**

Execute estes comandos para verificar se tudo está funcionando:

```powershell
# 1. Verificar se processo está rodando
Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*feed-cron-scheduler*"
}

# 2. Verificar tarefa agendada
Get-ScheduledTask -TaskName "NetImobiliaria_FeedService" -ErrorAction SilentlyContinue

# 3. Verificar última coleta (no banco)
# Execute no PostgreSQL:
# SELECT MAX(ultima_coleta) FROM feed.feed_fontes WHERE ativo = true;

# 4. Processar jobs manualmente para testar
npm run feed:processar-agora
```

### **Resultado Esperado**

- ✅ Processo Node.js rodando com `feed-cron-scheduler`
- ✅ Tarefa agendada `NetImobiliaria_FeedService` existe e está habilitada
- ✅ `ultima_coleta` atualizado nas últimas 2 horas
- ✅ Jobs sendo processados com sucesso

---

## 🚀 **SOLUÇÃO DEFINITIVA: Script de Verificação e Correção**

Crie um script para verificar e corrigir automaticamente:

```powershell
# scripts/verificar-e-corrigir-feed.ps1
Write-Host "[*] Verificando serviço de feed..." -ForegroundColor Cyan

# Verificar se está rodando
$processes = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*feed-cron-scheduler*"
}

if (-not $processes) {
    Write-Host "[!] Serviço não está rodando. Iniciando..." -ForegroundColor Yellow
    npm run feed:iniciar
} else {
    Write-Host "[OK] Serviço está rodando!" -ForegroundColor Green
    $processes | ForEach-Object {
        Write-Host "   PID: $($_.Id) | Iniciado: $($_.StartTime)" -ForegroundColor Gray
    }
}

# Verificar tarefa agendada
$task = Get-ScheduledTask -TaskName "NetImobiliaria_FeedService" -ErrorAction SilentlyContinue
if (-not $task) {
    Write-Host "[!] Tarefa agendada não encontrada. Configurando..." -ForegroundColor Yellow
    Write-Host "[*] Execute como Administrador: npm run feed:configurar-auto" -ForegroundColor Cyan
} else {
    Write-Host "[OK] Tarefa agendada encontrada!" -ForegroundColor Green
    Write-Host "   Estado: $($task.State)" -ForegroundColor Gray
}
```

**Adicionar ao package.json:**
```json
{
  "scripts": {
    "feed:verificar": "powershell -ExecutionPolicy Bypass -File ./scripts/verificar-e-corrigir-feed.ps1"
  }
}
```

---

## 📊 **MONITORAMENTO CONTÍNUO**

### **Criar Script de Monitoramento**

```powershell
# scripts/monitorar-feed.ps1
while ($true) {
    Clear-Host
    Write-Host "=== Monitoramento do Feed ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar processo
    $processes = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*feed-cron-scheduler*"
    }
    
    if ($processes) {
        Write-Host "[OK] Serviço rodando" -ForegroundColor Green
        $processes | ForEach-Object {
            Write-Host "   PID: $($_.Id) | Uptime: $((Get-Date) - $_.StartTime)" -ForegroundColor Gray
        }
    } else {
        Write-Host "[ERRO] Serviço NÃO está rodando!" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Pressione Ctrl+C para sair"
    Write-Host "Atualizando em 30 segundos..."
    
    Start-Sleep -Seconds 30
}
```

---

## 🎯 **RESUMO DA SOLUÇÃO**

### **Solução Rápida (Agora):**
```powershell
npm run feed:iniciar
```

### **Solução Definitiva (Automático):**
```powershell
# Como Administrador
npm run feed:configurar-auto
```

### **Verificar Status:**
```powershell
# Verificar processo
Get-Process node | Where-Object {$_.CommandLine -like "*feed-cron*"}

# Verificar tarefa
Get-ScheduledTask -TaskName "NetImobiliaria_FeedService"
```

---

## ✅ **PRÓXIMOS PASSOS**

1. ✅ **Diagnosticar:** Verificar se serviço está rodando
2. ✅ **Iniciar Agora:** `npm run feed:iniciar`
3. ✅ **Configurar Automático:** `npm run feed:configurar-auto` (como Admin)
4. ✅ **Verificar:** Aguardar algumas horas e verificar `ultima_coleta` no banco
5. ✅ **Monitorar:** Usar script de monitoramento se necessário

---

**Documento gerado para diagnóstico e solução**  
**Problema: Feed não está rodando automaticamente**  
**Status:** 🔧 Solução Disponível  
**Próximo passo:** Executar diagnóstico e aplicar solução




