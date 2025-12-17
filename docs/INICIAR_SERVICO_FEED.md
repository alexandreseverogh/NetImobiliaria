# 🚀 Como Iniciar o Serviço de Feed Automaticamente

## ⚡ INÍCIO RÁPIDO

### 1. Iniciar o serviço agora:

```powershell
npm run feed:iniciar
```

Ou diretamente:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/iniciar-servico-feed.ps1
```

### 2. Configurar para iniciar automaticamente ao ligar o computador:

```powershell
npm run feed:configurar-auto
```

Ou diretamente:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/configurar-inicio-automatico.ps1
```

**⚠️ IMPORTANTE:** Execute como Administrador para configurar o início automático.

---

## 📋 O QUE OS SCRIPTS FAZEM

### `feed:iniciar` (iniciar-servico-feed.ps1)

1. ✅ Verifica se o serviço já está rodando
2. ✅ Verifica se Node.js está instalado
3. ✅ Cria jobs pendentes automaticamente
4. ✅ Inicia o agendador em background
5. ✅ Mostra o PID do processo e informações úteis

### `feed:configurar-auto` (configurar-inicio-automatico.ps1)

1. ✅ Cria uma tarefa agendada no Windows
2. ✅ Configura para iniciar automaticamente ao ligar o computador
3. ✅ Configura reinício automático em caso de falha (3 tentativas)
4. ✅ Executa apenas se houver rede disponível

---

## 🔍 VERIFICAR SE ESTÁ FUNCIONANDO

### Método 1: Verificar processos

```powershell
Get-Process node -ErrorAction SilentlyContinue | Format-Table Id, ProcessName, StartTime
```

### Método 2: Verificar no banco de dados

```sql
-- Ver última coleta de cada fonte
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
- ✅ `ultima_coleta` < 2 horas = Serviço funcionando
- ⚠️ `ultima_coleta` > 2 horas = Serviço parou
- ❌ `ultima_coleta` NULL = Nunca coletou

### Método 3: Verificar jobs processados

```sql
-- Ver jobs processados nas últimas 24 horas
SELECT 
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as sucesso,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as falhas,
    MAX(finalizado_em) as ultimo_processamento
FROM feed.feed_jobs
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## 🔄 PROCESSAR JOBS MANUALMENTE

Se quiser processar jobs pendentes imediatamente (sem esperar o cron):

```powershell
npm run feed:processar-agora
```

Ou:

```powershell
node scripts/processar-jobs-pendentes.js
```

---

## 🛑 PARAR O SERVIÇO

```powershell
Get-Process node | Stop-Process -Force
```

**⚠️ CUIDADO:** Isso para TODOS os processos Node.js. Se você tiver outros serviços Node.js rodando, pare apenas os processos específicos do feed.

---

## 📊 MONITORAMENTO

### Ver logs do serviço

O serviço cria logs em `logs/feed-cron-YYYYMMDD-HHmmss.log`

### Verificar status via API

```powershell
curl http://localhost:3000/api/public/feed
```

Deve retornar os posts mais recentes em JSON.

---

## ⚙️ CONFIGURAÇÃO DO AGENDADOR

O agendador (`feed-cron-scheduler.js`) está configurado para:

- **Criar jobs:** A cada hora (minuto 0)
- **Processar jobs:** A cada 15 minutos
- **Fuso horário:** America/Sao_Paulo

Para alterar, edite `scripts/feed-cron-scheduler.js`:

```javascript
// Criar jobs a cada hora
cron.schedule('0 * * * *', async () => {
  // ...
});

// Processar jobs a cada 15 minutos
cron.schedule('*/15 * * * *', async () => {
  // ...
});
```

---

## 🐛 RESOLVER PROBLEMAS

### Problema: Serviço não inicia

1. Verificar se Node.js está instalado:
   ```powershell
   node --version
   ```

2. Verificar se as dependências estão instaladas:
   ```powershell
   npm install
   ```

3. Verificar se o arquivo `.env.local` existe e está configurado corretamente

### Problema: Jobs não são processados

1. Verificar se há jobs pendentes:
   ```sql
   SELECT COUNT(*) FROM feed.feed_jobs WHERE status = 'PENDING';
   ```

2. Processar manualmente:
   ```powershell
   npm run feed:processar-agora
   ```

3. Verificar logs do serviço em `logs/`

### Problema: Nenhum conteúdo aparece na página

1. Verificar se há conteúdos no banco:
   ```sql
   SELECT COUNT(*) FROM feed.feed_conteudos WHERE ativo = true;
   ```

2. Verificar se os conteúdos são recentes:
   ```sql
   SELECT MAX(data_publicacao) FROM feed.feed_conteudos;
   ```

3. Verificar se a API está retornando dados:
   ```powershell
   curl http://localhost:3000/api/public/feed
   ```

---

## 📝 RESUMO DOS COMANDOS

| Comando | Descrição |
|---------|-----------|
| `npm run feed:iniciar` | Inicia o serviço agora |
| `npm run feed:configurar-auto` | Configura início automático |
| `npm run feed:processar-agora` | Processa jobs pendentes imediatamente |
| `npm run feed:create-jobs` | Cria novos jobs na fila |
| `npm run feed:check` | Verifica status do serviço |
| `npm run feed:cron` | Inicia agendador manualmente |

---

## ✅ CHECKLIST DE CONFIGURAÇÃO

Após configurar o início automático:

- [ ] Serviço iniciou corretamente
- [ ] Jobs estão sendo criados (verificar no banco)
- [ ] Jobs estão sendo processados (verificar `ultima_coleta`)
- [ ] Conteúdos aparecem na página `/landpaging`
- [ ] Tarefa agendada foi criada no Windows (verificar no Agendador de Tarefas)

---

## 🎯 PRÓXIMOS PASSOS

1. **Iniciar o serviço agora:**
   ```powershell
   npm run feed:iniciar
   ```

2. **Configurar início automático:**
   ```powershell
   npm run feed:configurar-auto
   ```

3. **Verificar se está funcionando:**
   ```powershell
   npm run feed:check
   ```

4. **Aguardar algumas horas e verificar novos conteúdos na página**

---

## 💡 DICAS

- O serviço precisa estar rodando continuamente para coletar novos conteúdos
- Após falta de energia ou reinicialização, o serviço iniciará automaticamente (se configurado)
- Novos conteúdos aparecem automaticamente na página sem necessidade de ação manual
- O sistema evita duplicatas automaticamente usando `url_original` único

