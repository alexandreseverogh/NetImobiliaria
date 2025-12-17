# 🔄 Rotatividade e Renderização do Feed

## 📊 COMO FUNCIONA ATUALMENTE

### 1. **Coleta de Novos Conteúdos (Backend)**

```
A cada hora (ou conforme agendado):
  ↓
Cron cria jobs na fila (feed.feed_jobs)
  ↓
Processador busca feeds RSS
  ↓
Filtra conteúdo relacionado ao mercado imobiliário
  ↓
Traduz para português (se necessário)
  ↓
Salva no banco (feed.feed_conteudos)
  ↓
Novos posts ficam disponíveis na API
```

**Características:**
- ✅ Novos posts são salvos automaticamente
- ✅ Duplicatas são evitadas (`url_original` único)
- ✅ Posts são filtrados por relevância imobiliária
- ✅ Tradução automática acontece durante a coleta

---

### 2. **Seleção dos 8 Cards (API)**

A API `/api/public/feed` **sempre** retorna os **8 posts mais recentes**:

```sql
SELECT ... FROM feed.feed_conteudos
WHERE ativo = true
  AND (filtro de palavras-chave imobiliárias)
ORDER BY data_publicacao DESC  -- ← Sempre os mais recentes primeiro
LIMIT 8                         -- ← Sempre 8 cards
```

**Como funciona a rotatividade:**
- 📅 **Ordenação:** Sempre por `data_publicacao DESC` (mais recente primeiro)
- 🔢 **Limite:** Sempre 8 cards
- 🔄 **Rotatividade automática:** Quando um novo post é coletado:
  - Se for mais recente que algum dos 8 atuais → entra na lista
  - O post mais antigo dos 8 → sai da lista automaticamente
  - **Não precisa fazer nada** - acontece automaticamente na próxima consulta

**Exemplo:**
```
Estado Atual (8 cards):
1. Post de 25/11 10:00 ← Mais recente
2. Post de 25/11 09:00
3. Post de 25/11 08:00
...
8. Post de 24/11 15:00 ← Mais antigo

Novo post coletado: 25/11 11:00
  ↓
Próxima consulta da API:
1. Post de 25/11 11:00 ← NOVO (entra)
2. Post de 25/11 10:00
3. Post de 25/11 09:00
...
8. Post de 25/11 08:00
   Post de 24/11 15:00 ← Saiu (não aparece mais)
```

---

### 3. **Renderização na Página (Frontend)**

**Como funciona atualmente:**

```typescript
// Componente FeedSectionInline
useEffect(() => {
  async function fetchFeed() {
    const res = await fetch('/api/public/feed', {
      cache: 'no-store',  // ← Sempre busca dados frescos
    });
    const data = await res.json();
    setPosts(data.data);  // ← Atualiza os 8 cards
  }
  fetchFeed();
}, []);  // ← Executa APENAS UMA VEZ ao montar o componente
```

**Comportamento atual:**
- ✅ Carrega os 8 cards ao abrir a página
- ✅ Sempre mostra os mais recentes disponíveis
- ⚠️ **Não atualiza automaticamente** - precisa recarregar a página

**Quando novos posts aparecem:**
1. Usuário recarrega a página (F5 ou navegação)
2. Componente remonta
3. `useEffect` executa novamente
4. Busca os 8 mais recentes (que podem incluir novos posts)
5. Cards são atualizados

---

## 🔄 FLUXO COMPLETO DE ROTATIVIDADE

```
┌─────────────────────────────────────────────────────────┐
│ 1. NOVO CONTEÚDO COLETADO                              │
└─────────────────────────────────────────────────────────┘
                    ↓
    Cron processa feed → Salva no banco
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 2. POST FICA DISPONÍVEL NA API                          │
└─────────────────────────────────────────────────────────┘
                    ↓
    Próxima consulta: ORDER BY data_publicacao DESC LIMIT 8
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 3. API RETORNA OS 8 MAIS RECENTES                       │
└─────────────────────────────────────────────────────────┘
                    ↓
    Se novo post é mais recente → entra na lista
    Post mais antigo → sai da lista
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 4. USUÁRIO VÊ OS NOVOS CARDS                            │
└─────────────────────────────────────────────────────────┘
                    ↓
    Ao recarregar página → Frontend busca API → Cards atualizados
```

---

## 🎨 COMO OS CARDS SÃO RENDERIZADOS

### Estrutura do Grid:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  {posts.map((post) => (
    <Link key={post.id} href={post.url_original}>
      {/* Card com imagem, título, resumo, categoria, etc */}
    </Link>
  ))}
</div>
```

**Layout:**
- **Desktop:** 4 colunas × 2 linhas = 8 cards
- **Tablet:** 2 colunas × 4 linhas = 8 cards
- **Mobile:** 1 coluna (scroll vertical) = 8 cards

**Cada card mostra:**
- 🖼️ Imagem do post (ou ícone da categoria)
- 🏷️ Badge da categoria (com cor e ícone)
- 📰 Título do post
- 📝 Resumo (truncado)
- 📅 Data de publicação
- 🔗 Link para o artigo original

---

## ⚡ MELHORIAS OPCIONAIS (Futuro)

### 1. **Atualização Automática (Polling)**

Adicionar refresh automático a cada X minutos:

```typescript
useEffect(() => {
  async function fetchFeed() {
    // ... busca feed
  }
  
  fetchFeed(); // Busca inicial
  
  // Polling a cada 5 minutos
  const interval = setInterval(fetchFeed, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, []);
```

**Benefícios:**
- ✅ Usuário vê novos posts sem recarregar
- ✅ Experiência mais dinâmica

**Desvantagens:**
- ⚠️ Mais requisições ao servidor
- ⚠️ Pode consumir mais recursos

---

### 2. **Animações de Entrada**

Adicionar animação quando novos cards aparecem:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {/* Card */}
</motion.div>
```

---

### 3. **Indicador de Novos Posts**

Mostrar badge "Novo" em posts coletados nas últimas horas:

```tsx
{isNewPost(post.data_publicacao) && (
  <span className="badge-novo">Novo</span>
)}
```

---

### 4. **Cache Inteligente (ISR)**

Usar Incremental Static Regeneration do Next.js:

```typescript
export const revalidate = 300; // Atualiza a cada 5 minutos
```

**Benefícios:**
- ✅ Performance melhor
- ✅ Menos carga no banco
- ✅ Atualização automática em background

---

## 📋 RESUMO DA ROTATIVIDADE

### Como funciona:
1. ✅ **Novos posts são coletados** automaticamente pelo cron
2. ✅ **Salvos no banco** com `data_publicacao`
3. ✅ **API sempre retorna os 8 mais recentes** (ORDER BY data_publicacao DESC)
4. ✅ **Rotatividade automática:** Post mais antigo sai, novo entra
5. ⚠️ **Renderização:** Requer recarregar página para ver novos posts

### Quando novos cards aparecem:
- 🔄 **Automaticamente:** Quando usuário recarrega a página
- 🔄 **Automaticamente:** Quando usuário navega para a página novamente
- ⚠️ **Não automático:** Enquanto está na página (sem reload)

### Ordenação:
- 📅 **Sempre:** Mais recente primeiro (`data_publicacao DESC`)
- 🔢 **Sempre:** 8 cards (`LIMIT 8`)
- 🎯 **Sempre:** Apenas conteúdo imobiliário (filtro de palavras-chave)

---

## 🎯 CONCLUSÃO

**Sistema atual:**
- ✅ Rotatividade funciona automaticamente
- ✅ Novos posts entram, antigos saem
- ✅ Sempre mostra os 8 mais recentes
- ⚠️ Requer reload para ver atualizações

**Para melhorar:**
- Implementar polling automático (opcional)
- Adicionar animações de entrada (opcional)
- Usar cache inteligente (opcional)

O sistema está funcionando corretamente! A rotatividade acontece automaticamente - novos posts coletados aparecem na próxima consulta da API.

