# 🗑️ Como Remover ou Desativar Fontes RSS

## ✅ SIM, VOCÊ PODE REMOVER/DESATIVAR FONTES

Existem duas opções: **desativar** (recomendado) ou **deletar**.

---

## 🎯 OPÇÃO 1: DESATIVAR FONTE (Recomendado)

**Vantagens:**
- ✅ Mais seguro (pode reativar depois)
- ✅ Mantém histórico de conteúdos já coletados
- ✅ Não quebra relacionamentos no banco

**O que acontece:**
- ❌ Não cria mais jobs para essa fonte
- ❌ Não coleta novos conteúdos
- ✅ Conteúdos já coletados permanecem no banco
- ✅ Conteúdos já coletados continuam aparecendo na página (se `ativo = true`)

### SQL para desativar:

```sql
-- Desativar fonte InfoMoney
UPDATE feed.feed_fontes 
SET ativo = false 
WHERE url_feed LIKE '%infomoney%';

-- Verificar se foi desativada
SELECT nome, url_feed, ativo 
FROM feed.feed_fontes 
WHERE url_feed LIKE '%infomoney%';
```

**Para remover os conteúdos já coletados também:**

```sql
-- Desativar fonte
UPDATE feed.feed_fontes 
SET ativo = false 
WHERE url_feed LIKE '%infomoney%';

-- Desativar conteúdos já coletados dessa fonte
UPDATE feed.feed_conteudos 
SET ativo = false 
WHERE fonte_fk = (SELECT id FROM feed.feed_fontes WHERE url_feed LIKE '%infomoney%');
```

---

## 🗑️ OPÇÃO 2: DELETAR FONTE

**Atenção:** Mais drástico, mas remove completamente.

**O que acontece:**
- ❌ Remove a fonte da tabela
- ⚠️ Conteúdos ficam órfãos (sem `fonte_fk`)
- ⚠️ Pode causar problemas se houver foreign keys

### SQL para deletar (com conteúdos):

```sql
-- 1. Deletar conteúdos primeiro
DELETE FROM feed.feed_conteudos 
WHERE fonte_fk = (SELECT id FROM feed.feed_fontes WHERE url_feed LIKE '%infomoney%');

-- 2. Deletar jobs relacionados
DELETE FROM feed.feed_jobs 
WHERE fonte_fk = (SELECT id FROM feed.feed_fontes WHERE url_feed LIKE '%infomoney%');

-- 3. Deletar a fonte
DELETE FROM feed.feed_fontes 
WHERE url_feed LIKE '%infomoney%';
```

---

## 🔍 IDENTIFICAR FONTE CORRETA

Antes de remover, identifique a fonte exata:

```sql
-- Ver todas as fontes InfoMoney
SELECT 
    id,
    nome,
    url_feed,
    ativo,
    ultima_coleta
FROM feed.feed_fontes
WHERE url_feed LIKE '%infomoney%' 
   OR nome LIKE '%InfoMoney%';
```

---

## 📋 RECOMENDAÇÃO

**Para InfoMoney (conteúdos não relacionados ao mercado imobiliário):**

```sql
-- 1. Desativar fonte (para não coletar mais)
UPDATE feed.feed_fontes 
SET ativo = false 
WHERE url_feed LIKE '%infomoney%';

-- 2. Desativar conteúdos já coletados (para não aparecerem na página)
UPDATE feed.feed_conteudos 
SET ativo = false 
WHERE fonte_fk = (SELECT id FROM feed.feed_fontes WHERE url_feed LIKE '%infomoney%');

-- 3. Verificar
SELECT 
    f.nome,
    f.ativo as fonte_ativa,
    COUNT(c.id) as total_conteudos,
    COUNT(CASE WHEN c.ativo THEN 1 END) as conteudos_ativos
FROM feed.feed_fontes f
LEFT JOIN feed.feed_conteudos c ON f.id = c.fonte_fk
WHERE f.url_feed LIKE '%infomoney%'
GROUP BY f.id, f.nome, f.ativo;
```

---

## ✅ VERIFICAR SE FUNCIONOU

### 1. Verificar fonte desativada:

```sql
SELECT nome, url_feed, ativo 
FROM feed.feed_fontes 
WHERE url_feed LIKE '%infomoney%';
```

**Esperado:** `ativo = false`

### 2. Verificar conteúdos desativados:

```sql
SELECT COUNT(*) as total_desativados
FROM feed.feed_conteudos c
JOIN feed.feed_fontes f ON c.fonte_fk = f.id
WHERE f.url_feed LIKE '%infomoney%' 
  AND c.ativo = false;
```

### 3. Testar API:

```powershell
curl http://localhost:3000/api/public/feed
```

**Esperado:** Não deve retornar posts do InfoMoney.

---

## 🔄 REATIVAR (Se necessário)

Se quiser reativar depois:

```sql
-- Reativar fonte
UPDATE feed.feed_fontes 
SET ativo = true 
WHERE url_feed LIKE '%infomoney%';

-- Reativar conteúdos (opcional)
UPDATE feed.feed_conteudos 
SET ativo = true 
WHERE fonte_fk = (SELECT id FROM feed.feed_fontes WHERE url_feed LIKE '%infomoney%');
```

---

## 📝 RESUMO

**Para remover InfoMoney:**

1. ✅ **Desativar fonte:** `UPDATE feed.feed_fontes SET ativo = false WHERE url_feed LIKE '%infomoney%';`
2. ✅ **Desativar conteúdos:** `UPDATE feed.feed_conteudos SET ativo = false WHERE fonte_fk = ...`
3. ✅ **Resultado:** Não coleta mais + não exibe conteúdos existentes

**A funcionalidade não exibirá mais esses conteúdos!** ✅

