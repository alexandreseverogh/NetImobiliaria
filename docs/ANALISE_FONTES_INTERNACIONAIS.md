# 📊 Análise: Adicionar Fontes RSS Internacionais

## ✅ FONTES PARA ADICIONAR

### 1. **Zillow Research** ✅
- **URL:** https://www.zillow.com/research/data/feed/
- **Categoria:** Mercado Financeiro
- **Idioma:** English (será traduzido)
- **Status:** Nova fonte

### 2. **Realtor.com** ✅
- **URL:** https://www.realtor.com/news/feed/
- **Categoria:** Tendências
- **Idioma:** English (será traduzido)
- **Status:** Nova fonte

### 3. **ArchDaily** ⚠️
- **URL:** https://www.archdaily.com/rss
- **Categoria:** Decoração
- **Idioma:** English/Spanish/Portuguese
- **Status:** JÁ EXISTE (verificar se URL está correta)

### 4. **Dezeen** ⚠️
- **URL:** https://www.dezeen.com/architecture/feed/
- **Categoria:** Decoração
- **Idioma:** English
- **Status:** JÁ EXISTE

### 5. **Architectural Digest** ✅
- **URL:** https://www.architecturaldigest.com/feed/rss
- **Categoria:** Decoração
- **Idioma:** English (será traduzido)
- **Status:** Nova fonte

### 6. **Dwell** ✅
- **URL:** https://www.dwell.com/feed
- **Categoria:** Decoração
- **Idioma:** English (será traduzido)
- **Status:** Nova fonte

### 7. **Apartment Therapy** ✅
- **URL:** https://www.apartmenttherapy.com/rss.xml
- **Categoria:** Decoração
- **Idioma:** English (será traduzido)
- **Status:** Nova fonte

### 8. **Propmodo** ✅
- **URL:** https://www.propmodo.com/feed/
- **Categoria:** Tecnologia
- **Idioma:** English (será traduzido)
- **Status:** Nova fonte

### 9. **CNET Smart Home** ✅
- **URL:** https://www.cnet.com/rss/news/smart-home/
- **Categoria:** Tecnologia
- **Idioma:** English (será traduzido)
- **Status:** Nova fonte

### 10. **The Verge Smart Home** ✅
- **URL:** https://www.theverge.com/smart-home/rss/index.xml
- **Categoria:** Tecnologia
- **Idioma:** English (será traduzido)
- **Status:** Nova fonte

### 11. **CoinDesk** ✅
- **URL:** https://www.coindesk.com/arc/outboundfeeds/rss/
- **Categoria:** Tokenização
- **Idioma:** English (será traduzido)
- **Status:** Nova fonte

---

## 📋 RESUMO

- **Total de fontes:** 11
- **Já existem:** 2 (ArchDaily, Dezeen)
- **Novas para adicionar:** 9
- **Todas serão traduzidas:** Sim (idioma 'en')

---

## ⚠️ OBSERVAÇÕES

### URLs que podem precisar de verificação:

1. **Zillow Research:** URL pode variar, verificar se `/research/data/feed/` está correto
2. **Realtor.com:** Verificar se `/news/feed/` existe
3. **CoinDesk:** URL pode ser diferente, verificar formato RSS

### Categorias mapeadas:

- **Mercado Financeiro:** Zillow Research
- **Tendências:** Realtor.com
- **Decoração:** ArchDaily, Dezeen, Architectural Digest, Dwell, Apartment Therapy
- **Tecnologia:** Propmodo, CNET Smart Home, The Verge Smart Home
- **Tokenização:** CoinDesk

---

## 🚀 COMO ADICIONAR

Execute o script SQL:

```bash
psql -U postgres -d net_imobiliaria -f scripts/adicionar-fontes-internacionais.sql
```

Ou execute diretamente no banco de dados.

---

## ✅ APÓS ADICIONAR

1. **Criar jobs:**
   ```bash
   npm run feed:create-jobs
   ```

2. **Processar:**
   ```bash
   curl http://localhost:3000/api/cron/feed-sync
   ```

3. **Verificar:**
   ```sql
   SELECT nome, url_feed, ativo FROM feed.feed_fontes WHERE nome IN ('Zillow Research', 'Realtor.com', ...);
   ```

---

## 🔍 VERIFICAÇÃO DE URLs RSS

Antes de adicionar, pode testar se as URLs RSS estão corretas:

```bash
# Testar URL RSS
curl https://www.zillow.com/research/data/feed/
curl https://www.realtor.com/news/feed/
# etc...
```

Se retornar XML válido, a URL está correta.

