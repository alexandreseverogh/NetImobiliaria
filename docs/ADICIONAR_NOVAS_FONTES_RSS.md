# ➕ Como Adicionar Novas Fontes RSS Manualmente

## ✅ SIM, VOCÊ PODE ADICIONAR MANUALMENTE!

Você pode adicionar qualquer fonte RSS diretamente na tabela `feed.feed_fontes` e o sistema vai processar automaticamente.

---

## 📋 PASSO A PASSO

### 1. **Verificar Categorias Disponíveis**

Primeiro, veja quais categorias existem:

```sql
SELECT id, nome, slug FROM feed.feed_categorias ORDER BY ordem;
```

**Categorias disponíveis:**
- Mercado Financeiro (slug: `mercado-financeiro`)
- Tecnologia (slug: `tecnologia`)
- Decoração (slug: `decoracao`)
- Tendências (slug: `tendencias`)
- Segurança (slug: `seguranca`)
- História (slug: `historia`)
- Tokenização (slug: `tokenizacao`)

---

### 2. **Adicionar Nova Fonte**

Execute este SQL (substitua os valores):

```sql
INSERT INTO feed.feed_fontes (
    nome,
    url_feed,
    categoria_fk,
    idioma,
    tipo,
    ativo,
    status_coleta
) VALUES (
    'Nome da Fonte',                    -- Nome que aparecerá na página
    'https://exemplo.com/rss',          -- URL do feed RSS
    (SELECT id FROM feed.feed_categorias WHERE slug = 'tendencias'),  -- Categoria
    'pt',                               -- Idioma: 'pt', 'en', 'es', etc.
    'RSS',                              -- Tipo: 'RSS' (padrão)
    true,                               -- Ativo: true para processar
    'OK'                                -- Status inicial
);
```

**Exemplo prático:**

```sql
-- Adicionar feed de arquitetura em português
INSERT INTO feed.feed_fontes (
    nome,
    url_feed,
    categoria_fk,
    idioma,
    tipo,
    ativo,
    status_coleta
) VALUES (
    'Arquitetura e Urbanismo',
    'https://exemplo.com/arquitetura/rss',
    (SELECT id FROM feed.feed_categorias WHERE slug = 'decoracao'),
    'pt',
    'RSS',
    true,
    'OK'
);
```

---

### 3. **Criar Job para Processar**

Após adicionar a fonte, crie um job para processar:

```sql
INSERT INTO feed.feed_jobs (fonte_fk, status, created_at)
SELECT id, 'PENDING', NOW()
FROM feed.feed_fontes
WHERE nome = 'Nome da Fonte'
  AND id NOT IN (SELECT fonte_fk FROM feed.feed_jobs WHERE status = 'PENDING');
```

**Ou use o script:**
```bash
npm run feed:create-jobs
```

---

### 4. **Processar Manualmente (Opcional)**

Se quiser processar imediatamente:

```bash
curl http://localhost:3000/api/cron/feed-sync
```

Ou aguarde o cron automático processar (a cada 15 minutos).

---

## 🔍 VERIFICAR SE FUNCIONOU

### Verificar fonte adicionada:

```sql
SELECT 
    f.id,
    f.nome,
    f.url_feed,
    f.idioma,
    c.nome as categoria,
    f.ativo,
    f.status_coleta
FROM feed.feed_fontes f
LEFT JOIN feed.feed_categorias c ON f.categoria_fk = c.id
WHERE f.nome = 'Nome da Fonte';
```

### Verificar conteúdos coletados:

```sql
SELECT 
    c.titulo,
    c.data_publicacao,
    f.nome as fonte
FROM feed.feed_conteudos c
JOIN feed.feed_fontes f ON c.fonte_fk = f.id
WHERE f.nome = 'Nome da Fonte'
ORDER BY c.data_publicacao DESC
LIMIT 10;
```

---

## ⚠️ IMPORTANTE - CAMPOS OBRIGATÓRIOS

### Campos que você DEVE preencher:

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `nome` | VARCHAR(200) | Nome da fonte | 'Arquitetura e Urbanismo' |
| `url_feed` | VARCHAR(500) | URL do feed RSS | 'https://exemplo.com/rss' |
| `categoria_fk` | INTEGER | ID da categoria | (SELECT id FROM ...) |
| `idioma` | VARCHAR(10) | Idioma do feed | 'pt', 'en', 'es' |
| `ativo` | BOOLEAN | Se está ativo | `true` |
| `status_coleta` | VARCHAR(20) | Status inicial | 'OK' |

### Campos opcionais (têm valores padrão):

- `tipo` → Padrão: 'RSS'
- `ultima_coleta` → Será preenchido automaticamente
- `intervalo_minutos` → Padrão: 240 (4 horas)
- `created_at` → Preenchido automaticamente

---

## 🌐 IDIOMAS SUPORTADOS

O sistema traduz automaticamente para português se o feed não for em português:

- `'pt'` → Português (não traduz)
- `'en'` → Inglês (traduz para português)
- `'es'` → Espanhol (traduz para português)
- `'fr'` → Francês (traduz para português)
- Outros → Tentará traduzir para português

**Importante:** Defina o idioma correto para que a tradução funcione!

---

## 📝 EXEMPLO COMPLETO

### Adicionar feed internacional de imóveis:

```sql
-- 1. Adicionar fonte
INSERT INTO feed.feed_fontes (
    nome,
    url_feed,
    categoria_fk,
    idioma,
    tipo,
    ativo,
    status_coleta
) VALUES (
    'International Real Estate News',
    'https://exemplo.com/real-estate/rss',
    (SELECT id FROM feed.feed_categorias WHERE slug = 'tendencias'),
    'en',  -- ← Inglês, será traduzido automaticamente
    'RSS',
    true,
    'OK'
);

-- 2. Criar job para processar
INSERT INTO feed.feed_jobs (fonte_fk, status, created_at)
SELECT id, 'PENDING', NOW()
FROM feed.feed_fontes
WHERE url_feed = 'https://exemplo.com/real-estate/rss';

-- 3. Verificar
SELECT * FROM feed.feed_fontes WHERE url_feed = 'https://exemplo.com/real-estate/rss';
```

---

## 🔄 PROCESSAMENTO AUTOMÁTICO

Após adicionar a fonte:

1. ✅ **Cron automático** vai criar jobs periodicamente
2. ✅ **Processador** vai buscar o feed RSS
3. ✅ **Filtro** vai verificar se é conteúdo imobiliário
4. ✅ **Tradução** vai traduzir se necessário
5. ✅ **Salvamento** vai salvar no banco
6. ✅ **Exibição** vai aparecer na página automaticamente

**Não precisa fazer mais nada!** O sistema processa automaticamente.

---

## ⚠️ TROUBLESHOOTING

### Se a fonte não processar:

1. **Verificar se está ativa:**
   ```sql
   SELECT ativo FROM feed.feed_fontes WHERE nome = 'Nome da Fonte';
   ```
   Deve ser `true`.

2. **Verificar se há job pendente:**
   ```sql
   SELECT j.*, f.nome 
   FROM feed.feed_jobs j
   JOIN feed.feed_fontes f ON j.fonte_fk = f.id
   WHERE f.nome = 'Nome da Fonte' AND j.status = 'PENDING';
   ```

3. **Verificar erros:**
   ```sql
   SELECT status_coleta, msg_erro, ultima_coleta
   FROM feed.feed_fontes
   WHERE nome = 'Nome da Fonte';
   ```

4. **Testar URL do feed:**
   ```bash
   curl https://exemplo.com/rss
   ```
   Deve retornar XML válido.

---

## 📋 CHECKLIST

Antes de adicionar uma nova fonte, verifique:

- [ ] URL do feed RSS está correta e acessível
- [ ] Feed retorna XML válido
- [ ] Categoria existe no banco
- [ ] Idioma está correto (pt, en, es, etc.)
- [ ] Campo `ativo` está como `true`
- [ ] Criou job para processar (ou aguardar cron automático)

---

## 🎯 RESUMO

**SIM, você pode adicionar manualmente!**

1. ✅ Adicione na tabela `feed.feed_fontes`
2. ✅ Crie um job (ou aguarde cron automático)
3. ✅ Sistema processa automaticamente
4. ✅ Conteúdos aparecem na página

**O sistema é totalmente flexível** - qualquer feed RSS pode ser adicionado e será processado automaticamente!

