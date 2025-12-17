# 📝 Como Executar Seed Manual do Feed

## 🎯 Objetivo
Criar manualmente as categorias e fontes do feed no banco de dados usando SQL.

---

## 📋 PASSO A PASSO

### 1. Executar Migration de Idioma (se ainda não executou)

```bash
psql -U postgres -d net_imobiliaria -f database/migrations/018_add_idioma_to_feed_fontes.sql
```

### 2. Executar Seed Manual

**Opção A - Via psql:**
```bash
psql -U postgres -d net_imobiliaria -f database/migrations/019_seed_feed_manual.sql
```

**Opção B - Via pgAdmin ou DBeaver:**
1. Abra o arquivo `database/migrations/019_seed_feed_manual.sql`
2. Execute todo o conteúdo no banco `net_imobiliaria`

**Opção C - Via linha de comando direto:**
```bash
psql -U postgres -d net_imobiliaria -c "\i database/migrations/019_seed_feed_manual.sql"
```

---

## ✅ O QUE SERÁ CRIADO

### Categorias (7):
1. Mercado Financeiro
2. Tecnologia
3. Decoração
4. Tendências
5. Segurança
6. História
7. Tokenização

### Fontes Brasileiras (4):
1. InfoMoney - Mercados (pt)
2. Exame - Investimentos (pt)
3. Casa Vogue (pt)
4. CoinTelegraph Brasil (pt)

### Fontes Internacionais (9):
1. Reuters Real Estate (en)
2. Bloomberg Real Estate (en)
3. Wall Street Journal Real Estate (en)
4. Forbes Real Estate (en)
5. ArchDaily (en)
6. Dezeen Architecture (en)
7. PropTech News (en)
8. Real Estate Tech News (en)
9. CoinTelegraph Real Estate (en)

**Total: 13 fontes configuradas**

---

## 🔍 VERIFICAR SE FUNCIONOU

Execute no banco:

```sql
-- Ver categorias
SELECT id, nome, slug FROM feed.feed_categorias ORDER BY ordem;

-- Ver fontes
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

---

## 🚀 PRÓXIMOS PASSOS

Após executar o seed manual:

1. **Criar jobs na fila:**
   ```bash
   npm run feed:create-jobs
   ```

2. **Processar jobs (teste manual):**
   ```bash
   curl http://localhost:3000/api/cron/feed-sync
   ```

3. **Ou iniciar agendador automático:**
   ```bash
   npm install node-cron
   npm run feed:cron
   ```

---

## ⚠️ OBSERVAÇÕES

- O script usa `ON CONFLICT` para evitar duplicatas
- Se uma fonte já existe, apenas atualiza nome e idioma
- Todas as fontes são criadas como `ativo = true`
- O campo `idioma` é preenchido automaticamente (pt ou en)

