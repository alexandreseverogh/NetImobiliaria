# 🚀 Próximos Passos Após Seed Manual

## ✅ PASSO 1: Verificar se Funcionou

Execute no banco de dados para confirmar:

```sql
-- Ver categorias criadas
SELECT id, nome, slug FROM feed.feed_categorias ORDER BY ordem;

-- Ver fontes criadas
SELECT 
    f.id,
    f.nome,
    f.idioma,
    c.nome as categoria,
    f.ativo
FROM feed.feed_fontes f
LEFT JOIN feed.feed_categorias c ON f.categoria_fk = c.id
ORDER BY f.idioma, f.nome;
```

**Esperado:** 7 categorias e 13 fontes (4 brasileiras + 9 internacionais)

---

## 📋 PASSO 2: Criar Jobs na Fila

Agora precisamos criar jobs na fila para processar os feeds:

```bash
npm run feed:create-jobs
```

Ou manualmente:

```bash
node scripts/create-feed-jobs.js
```

**O que faz:** Cria um job `PENDING` na tabela `feed.feed_jobs` para cada fonte ativa.

**Verificar jobs criados:**
```sql
SELECT 
    j.id,
    f.nome as fonte,
    j.status,
    j.created_at
FROM feed.feed_jobs j
JOIN feed.feed_fontes f ON j.fonte_fk = f.id
WHERE j.status = 'PENDING'
ORDER BY j.created_at;
```

---

## ⚙️ PASSO 3: Processar Jobs (Teste Manual)

Processar um job manualmente para testar:

```bash
curl http://localhost:3000/api/cron/feed-sync
```

**Repetir várias vezes** até não haver mais jobs pendentes:

```bash
# Windows PowerShell
for ($i=1; $i -le 15; $i++) { 
    Write-Host "Processando job $i..."; 
    curl http://localhost:3000/api/cron/feed-sync; 
    Start-Sleep -Seconds 2 
}
```

**Ou processar todos de uma vez:**
```bash
# Continuar chamando até retornar "Nenhum job pendente"
curl http://localhost:3000/api/cron/feed-sync
curl http://localhost:3000/api/cron/feed-sync
curl http://localhost:3000/api/cron/feed-sync
# ... até não haver mais jobs
```

---

## 🔍 PASSO 4: Verificar Conteúdos Coletados

Verificar se os conteúdos foram coletados e traduzidos:

```sql
-- Contar conteúdos por fonte
SELECT 
    f.nome as fonte,
    f.idioma,
    COUNT(c.id) as total_conteudos,
    COUNT(CASE WHEN c.ativo THEN 1 END) as ativos
FROM feed.feed_fontes f
LEFT JOIN feed.feed_conteudos c ON f.id = c.fonte_fk
GROUP BY f.id, f.nome, f.idioma
ORDER BY f.idioma, f.nome;

-- Ver últimos conteúdos coletados
SELECT 
    c.titulo,
    c.resumo,
    f.nome as fonte,
    f.idioma,
    c.data_publicacao,
    c.ativo
FROM feed.feed_conteudos c
JOIN feed.feed_fontes f ON c.fonte_fk = f.id
ORDER BY c.data_publicacao DESC
LIMIT 20;
```

**Esperado:** Conteúdos traduzidos para português (mesmo que a fonte seja `en`)

---

## 🌐 PASSO 5: Verificar na Página

Acesse a página e verifique se o feed está aparecendo:

```
http://localhost:3000/landpaging
```

**Ou testar a API diretamente:**

```bash
curl http://localhost:3000/api/public/feed
```

**Esperado:** JSON com 8 posts mais recentes (já traduzidos)

---

## 🔄 PASSO 6: Configurar Processamento Automático

### Opção A - Agendador Node.js (Desenvolvimento):

```bash
# Instalar node-cron (se ainda não instalou)
npm install node-cron

# Rodar agendador (fica rodando continuamente)
npm run feed:cron
```

**O que faz:**
- Cria jobs a cada hora
- Processa jobs a cada 15 minutos

### Opção B - Cron do Sistema (Produção):

Configure no crontab do servidor:

```bash
# Criar jobs a cada hora (minuto 0)
0 * * * * cd /caminho/projeto && npm run feed:create-jobs

# Processar jobs a cada 15 minutos
*/15 * * * * curl -X GET http://localhost:3000/api/cron/feed-sync
```

---

## 📊 RESUMO DO FLUXO

```
1. Seed Manual ✅ (JÁ FEITO)
   ↓
2. Criar Jobs na Fila
   ↓
3. Processar Jobs (buscar feeds, filtrar, traduzir, salvar)
   ↓
4. Verificar Conteúdos Coletados
   ↓
5. Ver na Página (/landpaging)
   ↓
6. Configurar Processamento Automático
```

---

## ⚠️ TROUBLESHOOTING

### Se não houver conteúdos coletados:

1. **Verificar se os feeds estão acessíveis:**
   ```bash
   curl https://www.infomoney.com.br/mercados/feed/
   ```

2. **Verificar logs do processamento:**
   ```sql
   SELECT 
       j.id,
       f.nome,
       j.status,
       j.log_erro,
       j.tentativas
   FROM feed.feed_jobs j
   JOIN feed.feed_fontes f ON j.fonte_fk = f.id
   WHERE j.status = 'FAILED'
   ORDER BY j.created_at DESC;
   ```

3. **Verificar status das fontes:**
   ```sql
   SELECT nome, status_coleta, msg_erro, ultima_coleta
   FROM feed.feed_fontes
   WHERE ativo = true;
   ```

### Se a tradução não funcionar:

- Verificar se as APIs gratuitas estão acessíveis
- Ver logs no console durante o processamento
- Conteúdos em português não serão traduzidos (comportamento esperado)

---

## ✅ CHECKLIST

- [ ] Seed manual executado
- [ ] Jobs criados na fila
- [ ] Jobs processados (pelo menos alguns)
- [ ] Conteúdos coletados no banco
- [ ] Feed aparecendo na página
- [ ] Processamento automático configurado

