# 🔄 Fluxo Completo do Feed Automatizado

## 📋 VISÃO GERAL DO SISTEMA

O sistema funciona em **3 etapas principais**:

1. **Criação de Jobs** → Cria jobs na fila para cada fonte
2. **Processamento** → Busca feeds, filtra, traduz e salva
3. **Exibição** → Mostra os 8 mais recentes na página

---

## 🔧 COMPONENTES DO SISTEMA

### 1. **Tabelas do Banco de Dados**

- `feed.feed_fontes` - Lista de fontes RSS configuradas
- `feed.feed_categorias` - Categorias de conteúdo
- `feed.feed_conteudos` - Posts coletados e traduzidos
- `feed.feed_jobs` - Fila de jobs de sincronização

### 2. **Scripts**

- `scripts/seed_feed.js` - Adiciona fontes ao banco (executar uma vez)
- `scripts/create-feed-jobs.js` - Cria jobs na fila (executar periodicamente)
- `scripts/feed-cron-scheduler.js` - Agendador automático (rodar continuamente)

### 3. **APIs**

- `/api/cron/feed-sync` - Processa um job pendente da fila
- `/api/public/feed` - Retorna 8 posts mais recentes para exibição

### 4. **Serviços**

- `src/lib/services/feedService.ts` - Busca, filtra e traduz feeds
- `src/lib/services/translationService.ts` - Tradução automática

---

## 🔄 FLUXO COMPLETO AUTOMATIZADO

### **ETAPA 1: Configuração Inicial (Uma vez)**

```bash
# 1. Adicionar fontes ao banco (brasileiras + internacionais)
node scripts/seed_feed.js

# Isso cria:
# - 5 fontes brasileiras
# - 9 fontes internacionais
# Total: 14 fontes configuradas
```

### **ETAPA 2: Criação Automática de Jobs (A cada hora)**

```bash
# Criar jobs na fila para todas as fontes ativas
node scripts/create-feed-jobs.js

# Ou usar o agendador automático:
npm run feed:cron
```

**O que faz:**
- Verifica todas as fontes ativas em `feed.feed_fontes`
- Cria um job em `feed.feed_jobs` com status `PENDING` para cada fonte
- Evita duplicatas (não cria se já existe job pendente)

### **ETAPA 3: Processamento Automático (A cada 15 minutos)**

O endpoint `/api/cron/feed-sync` processa jobs pendentes:

1. **Busca próximo job pendente** da fila (`feed.feed_jobs`)
2. **Marca como PROCESSING**
3. **Busca feed RSS** da fonte
4. **Parseia itens** do feed
5. **Filtra conteúdo** relacionado ao mercado imobiliário
6. **Traduz para português** (se necessário)
7. **Salva no banco** (`feed.feed_conteudos`)
8. **Marca job como COMPLETED**

### **ETAPA 4: Exibição na Página**

Quando usuário acessa `/landpaging`:

1. Frontend chama `/api/public/feed`
2. API retorna 8 posts mais recentes (já traduzidos)
3. Grid exibe os cards

---

## ⚙️ CONFIGURAÇÃO DO AGENDADOR

### Opção 1: Agendador Node.js (Desenvolvimento/Local)

```bash
# Instalar dependência
npm install node-cron

# Rodar agendador (fica rodando continuamente)
npm run feed:cron
```

**O que faz:**
- A cada hora: Cria novos jobs
- A cada 15 minutos: Processa jobs pendentes
- Roda continuamente até ser interrompido

### Opção 2: Cron do Sistema (Produção)

Configure no crontab do servidor:

```bash
# Criar jobs a cada hora (minuto 0)
0 * * * * cd /caminho/do/projeto && node scripts/create-feed-jobs.js

# Processar jobs a cada 15 minutos
*/15 * * * * curl -X GET http://localhost:3000/api/cron/feed-sync
```

### Opção 3: Vercel Cron (Se hospedado na Vercel)

Criar `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/feed-sync",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

E criar endpoint que também cria jobs:

```typescript
// src/app/api/cron/feed-sync-complete/route.ts
// Que cria jobs E processa
```

---

## 📊 FLUXO DETALHADO PASSO A PASSO

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CONFIGURAÇÃO INICIAL (Uma vez)                          │
└─────────────────────────────────────────────────────────────┘
                    ↓
    node scripts/seed_feed.js
                    ↓
    Adiciona 14 fontes ao banco (feed.feed_fontes)
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CRIAÇÃO DE JOBS (A cada hora)                           │
└─────────────────────────────────────────────────────────────┘
                    ↓
    node scripts/create-feed-jobs.js
                    ↓
    Cria jobs em feed.feed_jobs (status: PENDING)
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. PROCESSAMENTO (A cada 15 minutos)                       │
└─────────────────────────────────────────────────────────────┘
                    ↓
    GET /api/cron/feed-sync
                    ↓
    Busca próximo job PENDING
                    ↓
    Marca como PROCESSING
                    ↓
    fetchAndParseFeed(url_feed)
                    ↓
    Para cada item do feed:
      ├─ Filtra (isRealEstateRelated)
      ├─ Detecta idioma
      ├─ Traduz para português (se necessário)
      └─ Salva em feed.feed_conteudos
                    ↓
    Marca job como COMPLETED
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. EXIBIÇÃO (Quando usuário acessa página)                 │
└─────────────────────────────────────────────────────────────┘
                    ↓
    GET /api/public/feed
                    ↓
    SELECT ... FROM feed.feed_conteudos
    WHERE ativo = true
    ORDER BY data_publicacao DESC
    LIMIT 8
                    ↓
    Retorna 8 posts mais recentes (já traduzidos)
                    ↓
    Grid exibe os cards na página
```

---

## 🚀 COMO USAR

### Setup Inicial (Uma vez):

```bash
# 1. Adicionar fontes ao banco
node scripts/seed_feed.js

# 2. Criar jobs iniciais
node scripts/create-feed-jobs.js

# 3. Processar jobs manualmente (teste)
curl http://localhost:3000/api/cron/feed-sync
```

### Operação Contínua:

**Opção A - Agendador Node.js:**
```bash
npm run feed:cron
```

**Opção B - Cron do Sistema:**
Configure crontab conforme mostrado acima

**Opção C - Manual:**
```bash
# Criar jobs
npm run feed:create-jobs

# Processar (chamar múltiplas vezes até não haver mais pendentes)
curl http://localhost:3000/api/cron/feed-sync
```

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

- [x] Serviço de tradução implementado
- [x] Filtro de conteúdo imobiliário implementado
- [x] Fontes internacionais adicionadas
- [x] Endpoint de processamento criado
- [x] Script de criação de jobs criado
- [x] Agendador automático criado
- [ ] Instalar `node-cron`: `npm install node-cron`
- [ ] Executar seed: `node scripts/seed_feed.js`
- [ ] Configurar agendador (escolher uma opção acima)
- [ ] Testar fluxo completo

---

## 🔍 MONITORAMENTO

### Verificar Jobs Pendentes:

```sql
SELECT j.id, f.nome, j.status, j.created_at
FROM feed.feed_jobs j
JOIN feed.feed_fontes f ON j.fonte_fk = f.id
WHERE j.status = 'PENDING'
ORDER BY j.created_at ASC;
```

### Verificar Conteúdos Coletados:

```sql
SELECT COUNT(*) as total, 
       COUNT(CASE WHEN ativo THEN 1 END) as ativos,
       MAX(data_publicacao) as mais_recente
FROM feed.feed_conteudos;
```

### Verificar Fontes:

```sql
SELECT nome, status_coleta, ultima_coleta, msg_erro
FROM feed.feed_fontes
WHERE ativo = true;
```

---

## ⚠️ IMPORTANTE

1. **Tradução automática** acontece durante o processamento
2. **Filtro de conteúdo** garante que apenas posts relacionados ao mercado imobiliário sejam salvos
3. **Jobs são processados um por vez** para evitar sobrecarga
4. **Duplicatas são evitadas** pelo `url_original` único
5. **Sistema é resiliente** - se uma fonte falhar, outras continuam processando

