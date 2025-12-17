# 🔧 Como Corrigir Feeds com Erro

## 📋 FEEDS DESATIVADOS

Os seguintes feeds foram desativados porque não são relevantes:

- **Dwell** - Conteúdo não relacionado ao mercado imobiliário
- **Forbes Real Estate** - Conteúdo não relacionado ao mercado imobiliário  
- **Olhar Digital** - Maioria do conteúdo não relacionado ao mercado imobiliário

## 🔍 FEEDS IMPORTANTES QUE PRECISAM DE ATENÇÃO

### 1. Apartment Therapy
- **Status:** Tentando corrigir URL
- **URL atual:** `https://www.apartmenttherapy.com/rss.xml`
- **URL alternativa:** `https://www.apartmenttherapy.com/feed`
- **Ação:** Execute o script de correção

### 2. Architectural Digest
- **Status:** Pode precisar verificação manual
- **URL atual:** `https://www.architecturaldigest.com/feed/rss`
- **Possível problema:** Site pode ter mudado estrutura do feed
- **Ação:** Verificar manualmente se o feed está acessível

### 3. Bloomberg Real Estate
- **Status:** Pode precisar verificação manual
- **URL atual:** `https://www.bloomberg.com/feeds/real-estate.rss`
- **Possível problema:** Bloomberg pode exigir autenticação ou ter mudado feed
- **Ação:** Verificar se o feed está acessível ou se precisa de autenticação

### 4. Reuters Real Estate
- **Status:** Pode precisar verificação manual
- **URL atual:** `https://www.reuters.com/rssFeed/realEstate`
- **Possível problema:** Reuters pode ter mudado estrutura do feed
- **Ação:** Verificar se o feed está acessível

### 5. Wall Street Journal Real Estate
- **Status:** Pode precisar verificação manual
- **URL atual:** `https://feeds.a.dj.com/rss/RSSRealEstate.xml`
- **Possível problema:** WSJ pode ter mudado estrutura do feed
- **Ação:** Verificar se o feed está acessível

### 6. Real Estate Tech News
- **Status:** Pode precisar verificação manual
- **URL atual:** `https://www.realestatetechnews.com/feed/`
- **Possível problema:** Site pode ter mudado de domínio ou fechado
- **Ação:** Verificar se o site ainda existe

### 7. The Verge Smart Home
- **Status:** Pode precisar verificação manual
- **URL atual:** `https://www.theverge.com/smart-home/rss/index.xml`
- **Possível problema:** The Verge pode ter mudado estrutura do feed
- **Ação:** Verificar se o feed está acessível

## 🚀 COMO EXECUTAR

### Passo 1: Executar Script de Correção

```bash
psql -U postgres -d net_imobiliaria -f scripts/corrigir-e-desativar-feeds.sql
```

### Passo 2: Testar Feeds Corrigidos

```bash
npm run feed:testar-fontes
```

### Passo 3: Verificar Resultados

```sql
-- Ver fontes ativas e seus status
SELECT 
    nome,
    url_feed,
    ativo,
    status_coleta,
    msg_erro
FROM feed.feed_fontes
WHERE ativo = true
ORDER BY status_coleta, nome;
```

## 🔍 VERIFICAÇÃO MANUAL DE URLs

Se os feeds ainda estiverem com erro após a correção, teste manualmente:

```bash
# Testar URLs RSS manualmente
curl -I https://www.apartmenttherapy.com/feed
curl -I https://www.architecturaldigest.com/feed/rss
curl -I https://www.bloomberg.com/feeds/real-estate.rss
curl -I https://www.reuters.com/rssFeed/realEstate
curl -I https://feeds.a.dj.com/rss/RSSRealEstate.xml
curl -I https://www.realestatetechnews.com/feed/
curl -I https://www.theverge.com/smart-home/rss/index.xml
```

Se retornar `200 OK`, o feed está acessível. Se retornar `404` ou outro erro, a URL precisa ser atualizada.

## ⚠️ OBSERVAÇÕES IMPORTANTES

1. **Alguns sites podem bloquear requisições automatizadas** - Pode ser necessário usar User-Agent ou outras configurações
2. **Feeds podem ter mudado de formato** - Alguns sites migraram para JSON ou outros formatos
3. **Alguns feeds podem exigir autenticação** - Bloomberg e WSJ podem ter feeds premium
4. **Sites podem ter fechado** - Real Estate Tech News pode não existir mais

## 📝 PRÓXIMOS PASSOS

1. Execute o script de correção
2. Teste os feeds corrigidos
3. Para feeds que ainda estão com erro, verifique manualmente as URLs
4. Se necessário, atualize as URLs no banco de dados manualmente

