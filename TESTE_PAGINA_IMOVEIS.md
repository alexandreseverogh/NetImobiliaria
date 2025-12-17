# TESTE: Página de Imóveis (/admin/imoveis)

## CONTEXTO
Página padronizada para usar `useApi` em vez de `fetch` direto.

## INSTRUÇÕES DE TESTE

### 1. **Acessar a Página**
```
URL: http://localhost:3000/admin/imoveis
Usuário: admin/admin@123
```

### 2. **Verificar Console do Navegador**
Abra o DevTools (F12) → Console

**Deve aparecer:**
```
✅ Sem erros 401 (Unauthorized)
✅ Logs de imóveis: "🔍 Página de Imóveis - Dados recebidos da API"
✅ Sem erros vermelhos
```

### 3. **Verificar Network Tab**
Abra o DevTools (F12) → Network

**Para cada requisição (tipos, finalidades, status-imovel, imoveis):**
- ✅ Status: 200 OK
- ✅ Request Headers: Deve conter `Authorization: Bearer <token>`
- ✅ Response: JSON válido com dados

### 4. **Verificar Funcionalidades**

#### A. Carregamento Inicial
- [ ] Lista de imóveis é exibida
- [ ] Filtros de tipo são carregados
- [ ] Filtros de finalidade são carregados
- [ ] Filtros de status são carregados

#### B. Filtros
- [ ] Filtrar por código
- [ ] Filtrar por bairro
- [ ] Filtrar por estado
- [ ] Filtrar por município
- [ ] Filtrar por tipo
- [ ] Filtrar por finalidade
- [ ] Filtrar por status

#### C. Grid de Imóveis
- [ ] Imóveis são exibidos em grid
- [ ] Informações corretas (código, endereço, etc.)
- [ ] Links de edição funcionam
- [ ] Botão de visualizar funciona

#### D. Performance
- [ ] Carregamento rápido (< 2s)
- [ ] Sem travamentos
- [ ] Smooth scrolling

### 5. **Verificar Dados Retornados**
**Network Tab → Response de `/api/admin/imoveis`:**
```json
{
  "success": true,
  "data": [...], // Array de imóveis
  "total": 123
}
```

## EXPECTATIVAS

### ✅ SUCESSO
- Página carrega sem erros
- Todos os dados são exibidos
- Filtros funcionam
- Console limpo (sem erros)
- Network tab mostra Authorization header

### ❌ PROBLEMAS
- Erro 401 em qualquer requisição
- Dados não carregam
- Filtros não funcionam
- Console com erros vermelhos
- Network tab sem Authorization header

## CHECKLIST FINAL
- [ ] ✅ Teste 1: Console sem erros
- [ ] ✅ Teste 2: Network com Authorization
- [ ] ✅ Teste 3: Dados carregados
- [ ] ✅ Teste 4: Filtros funcionando
- [ ] ✅ Teste 5: Grid exibe imóveis

## PRÓXIMO PASSO
Após confirmar testes, avisar para prosseguir com PÁGINA 2: /admin/clientes
