# PADRONIZAÇÃO DE AUTENTICAÇÃO - CRONOGRAMA

## OBJETIVO
Padronizar todas as páginas para usar `useApi` em vez de `fetch` direto, garantindo que todas as requisições tenham o token de autenticação no header.

## CRONOGRAMA

### ✅ PÁGINA 1: /admin/imoveis
**Status:** ✅ CONCLUÍDA
**Arquivo:** `src/app/admin/imoveis/page.tsx`
**Alterações necessárias:**
- [ ] Importar `useApi`
- [ ] Substituir `fetch` por `useApi().get()`
- [ ] Testar carregamento de imóveis
- [ ] Testar filtros
- [ ] Testar paginação
- [ ] Testar performance

**Linhas a alterar:**
- Linha 42: `fetch('/api/admin/imoveis/tipos')` → `get('/api/admin/imoveis/tipos')`
- Linha 48: `fetch('/api/admin/imoveis/finalidades')` → `get('/api/admin/imoveis/finalidades')`
- Linha 56: `fetch('/api/admin/status-imovel')` → `get('/api/admin/status-imovel')`
- Linha 75: `fetch('/api/admin/imoveis?...)` → `get('/api/admin/imoveis?...)`

---

### ✅ PÁGINA 2: /admin/clientes
**Status:** ✅ CONCLUÍDA
**Arquivo:** `src/app/admin/clientes/page.tsx`

---

### ✅ PÁGINA 3: /admin/proprietarios
**Status:** ✅ CONCLUÍDA
**Arquivo:** `src/app/admin/proprietarios/page.tsx`

---

### ✅ PÁGINA 4: /admin/roles
**Status:** ✅ CONCLUÍDA
**Arquivo:** `src/app/admin/roles/page.tsx`

---

### ✅ PÁGINA 5: /admin/categorias-amenidades
**Status:** ✅ CONCLUÍDA
**Arquivo:** `src/app/admin/categorias-amenidades/page.tsx`

---

### ✅ PÁGINA 6: /admin/categorias-proximidades
**Status:** ✅ CONCLUÍDA
**Arquivo:** `src/app/admin/categorias-proximidades/page.tsx`

---

### ✅ PÁGINA 7: /admin/tipos-imoveis
**Status:** ✅ CONCLUÍDA
**Arquivo:** `src/app/admin/tipos-imoveis/page.tsx`

---

## CHECKLIST DE TESTES
- [ ] Página carrega sem erros 401
- [ ] Dados são exibidos corretamente
- [ ] Filtros funcionam
- [ ] Paginação funciona
- [ ] Performance não degrada
- [ ] Console sem erros
- [ ] Network tab mostra Authorization header

## NOTAS
- Cada página será testada individualmente antes de prosseguir
- Commits frequentes para facilitar rollback
- Documentação de cada alteração
