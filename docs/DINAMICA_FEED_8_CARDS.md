# 📰 Dinâmica do Feed de Conteúdos - 8 Cards

## 🎯 VISUALIZAÇÃO NA PÁGINA

### Layout Desktop
- **Grid Responsivo:** 2 linhas × 4 colunas = **8 cards total**
- **Primeira linha:** 4 cards mais recentes
- **Segunda linha:** 4 cards seguintes (também recentes)
- **Comportamento:** Todos os 8 cards visíveis simultaneamente (scroll vertical normal)

### Layout Mobile/Tablet
- **Carrossel Horizontal:** Scroll horizontal com snap
- **Visibilidade:** ~1.2 cards por vez para incentivar deslize
- **Total:** 8 cards disponíveis para scroll horizontal

---

## 🔄 DINÂMICA DE ATUALIZAÇÃO E ALTERNÂNCIA

### 1. **Coleta de Feeds (Backend)**
- **Cron Job:** `/api/cron/feed-sync` executa periodicamente (configurável)
- **Frequência Sugerida:** A cada 1 hora
- **Processo:**
  1. Busca próximo job pendente na fila (`feed.feed_jobs`)
  2. Faz fetch do RSS feed da fonte
  3. Parseia e extrai: título, resumo, imagem, link, data
  4. Salva no banco (`feed.feed_conteudos`) se não existir (evita duplicatas)
  5. Marca job como completo

### 2. **Armazenamento no Banco**
- **Tabela:** `feed.feed_conteudos`
- **Campos principais:**
  - `titulo`, `resumo`, `url_original`, `url_imagem`, `data_publicacao`
  - `ativo` (boolean) - controla se aparece na página
  - `fonte_fk`, `categoria_fk` - relacionamentos

### 3. **Exibição na Página (Frontend)**
- **API:** `/api/public/feed` retorna os **8 posts mais recentes**
- **Query SQL:** 
  ```sql
  SELECT ... FROM feed.feed_conteudos
  WHERE ativo = true
  ORDER BY data_publicacao DESC
  LIMIT 8
  ```
- **Ordenação:** Sempre por data de publicação (mais recente primeiro)

### 4. **Como Funciona a Alternância**
- **Automática:** Quando novos posts são coletados e salvos no banco, eles automaticamente aparecem na página
- **Sem ação do usuário:** A página sempre mostra os 8 mais recentes disponíveis
- **Atualização:** 
  - Usuário recarrega a página → vê os novos posts
  - Ou implementar refresh automático (opcional, via polling)

---

## 📊 FLUXO COMPLETO

```
1. CRON JOB (a cada 1h)
   ↓
2. Busca feeds RSS das fontes configuradas
   ↓
3. Parseia e extrai dados
   ↓
4. Salva no banco (feed.feed_conteudos)
   ↓
5. Usuário acessa /landpaging
   ↓
6. Frontend chama /api/public/feed
   ↓
7. API retorna 8 posts mais recentes (ORDER BY data_publicacao DESC)
   ↓
8. Grid exibe os 8 cards
```

---

## 🎨 COMPORTAMENTO VISUAL

### Desktop (≥1024px)
```
┌─────┬─────┬─────┬─────┐
│  1  │  2  │  3  │  4  │  ← Primeira linha (mais recentes)
├─────┼─────┼─────┼─────┤
│  5  │  6  │  7  │  8  │  ← Segunda linha
└─────┴─────┴─────┴─────┘
```

### Mobile (<1024px)
```
┌─────┬─────┐
│  1  │  2  │  ← Scroll horizontal
└─────┴─────┘
     ↓
┌─────┬─────┐
│  3  │  4  │
└─────┴─────┘
     ↓
... até o card 8
```

---

## ⚙️ CONFIGURAÇÕES E PERSONALIZAÇÃO

### Alterar Quantidade de Cards
- **API:** Editar `LIMIT 8` em `src/app/api/public/feed/route.ts`
- **Grid:** O CSS já suporta qualquer quantidade (grid responsivo)

### Alterar Frequência de Atualização
- **Cron:** Configurar no serviço de cron (ex: Vercel Cron, GitHub Actions, etc.)
- **Endpoint:** `/api/cron/feed-sync`

### Adicionar Novas Fontes
- **Script:** `scripts/seed_feed.js` - adicionar nova fonte no array `sourcesToSeed`
- **Banco:** Inserir manualmente em `feed.feed_fontes` se necessário

---

## 🔍 DETALHES TÉCNICOS

### Ordenação e Seleção
- **Sempre:** `ORDER BY data_publicacao DESC` (mais recente primeiro)
- **Filtro:** Apenas posts com `ativo = true`
- **Limite:** 8 cards (configurável)

### Performance
- **Cache:** API usa `dynamic = 'force-dynamic'` (sem cache)
- **Banco:** Query simples e rápida (índice em `data_publicacao` recomendado)
- **Frontend:** Componente carrega uma vez ao montar a página

### Atualização em Tempo Real
- **Atual:** Requer recarregar a página para ver novos posts
- **Futuro (opcional):** Implementar polling ou WebSocket para atualização automática

---

## 📝 OBSERVAÇÕES IMPORTANTES

1. **Sem Paginação:** Os 8 cards são fixos - sempre os mais recentes
2. **Sem Filtros:** Todos os posts são misturados (qualquer categoria)
3. **Rotatividade:** Posts antigos saem automaticamente quando novos são adicionados
4. **Duplicatas:** Evitadas pelo `url_original` (único no banco)

---

## 🚀 PRÓXIMOS PASSOS (Opcional)

- [ ] Implementar refresh automático (polling a cada 5min)
- [ ] Adicionar filtro por categoria
- [ ] Adicionar paginação (ver mais posts)
- [ ] Adicionar animação de entrada para novos cards
- [ ] Implementar cache inteligente (ISR do Next.js)

