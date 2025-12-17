# 📊 Análise Completa de Ocorrências de 'WRITE' na Aplicação

## ✅ 1. LEGÍTIMAS (Não precisam ser alteradas)
Estas são ocorrências que fazem sentido manter:

### 1.1 WriteGuard Deprecated (Retrocompatibilidade)
- ✅ `src/components/admin/PermissionGuard.tsx` - `WriteGuard` marcado como DEPRECATED com warning
- ✅ Comentários explicando a eliminação do WRITE

### 1.2 Funções de Sistema Operacional (não relacionadas a permissões)
- ✅ `src/app/api/admin/imoveis/[id]/imagens/route.ts` - `writeFile` do Node.js (sistema de arquivos)
- ✅ `src/components/property/DocumentModal.tsx` - `popup.document.write` (JavaScript nativo)
- ✅ `src/components/property/DocumentosLista.tsx` - `popup.document.write` (JavaScript nativo)

### 1.3 Scripts PowerShell (comandos Write-Host)
- ✅ `database/execute_setup.ps1` - comandos `Write-Host` do PowerShell

### 1.4 Arquivo JSON Legado (não usado)
- ✅ `src/lib/admin/users.json` - arquivo JSON que NÃO é usado (gestão via banco de dados)

---

## ⚠️ 2. PRECISAM SER CORRIGIDOS

### 2.1 🔴 CRÍTICO: Código Backend Ativo (Lógica de Permissões)

#### A. `src/lib/database/userPermissions.ts` (USADO ATIVAMENTE)
```typescript
// Linha 6, 10, 107, 113, 263, 265, 273, 288, 306
- Interfaces ainda definem: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
- Mapeamento ainda usa WRITE
- Função mapActionToPermissionLevel retorna 'WRITE'
```

#### B. `src/lib/permissions/PermissionChecker.ts` (MIDDLEWARE ATIVO)
```typescript
// Linhas 35-44, 55, 61, 124, 145, 178, 186
- requiredActionMap inclui 'WRITE'
- Tipos TypeScript ainda aceitam 'WRITE'
- SQL query mapeia create/update para 'WRITE'
```

#### C. `src/lib/middleware/UnifiedPermissionMiddleware.ts`
```typescript
// Linha 44
- default_action aceita 'WRITE'
```

#### D. `src/lib/admin/auth.ts`
```typescript
// Linhas 114-116
- Lógica de hierarquia de permissões usa WRITE
```

#### E. `src/lib/permissions/PermissionValidator.ts`
```typescript
// Linha 187
- Função canWrite retorna WRITE
```

---

### 2.2 🟠 IMPORTANTE: Páginas Frontend

#### A. Páginas ainda usando hasPermission('...', 'WRITE')
- `src/app/admin/tipos-imoveis/novo/page.tsx` (linha 30)
- `src/app/admin/tipos-imoveis/page.tsx` (linha 64) - console.log
- `src/app/admin/proprietarios/[id]/editar/page.tsx` (linha 67)
- `src/app/admin/clientes/[id]/editar/page.tsx` (linha 67)

---

### 2.3 🟡 MÉDIO: APIs Backend (Várias rotas)

#### A. APIs de Imóveis
- `src/app/api/admin/imoveis/[id]/restore/route.ts` (linha 29)
- `src/app/api/admin/imoveis/[id]/proximidades/route.ts` (linhas 103, 196, 271)
- `src/app/api/admin/imoveis/[id]/amenidades/route.ts` (linhas 103, 190, 259)
- `src/app/api/admin/imoveis/route-backup.ts` (linha 148)

#### B. APIs de Perfis
- `src/app/api/admin/perfis/[id]/route.ts` (linhas 135, 148, 152-153, 155, 328)
- `src/app/api/admin/perfis/route.ts` (linhas 97, 110, 114-115, 117, 263)

#### C. API de Login (mapeamento de permissões)
- `src/app/api/admin/auth/login/route.ts` (linhas 96, 332)

#### D. APIs de Setup
- `src/app/api/admin/setup-categories-permissions/route.ts` (linha 41)
- `src/app/api/admin/fix-permissions/route.ts` (linha 38)

---

### 2.4 🔵 COMPONENTES UI

#### A. Editor de Permissões
- `src/components/admin/PermissoesEditor.tsx` (linhas 34, 107)
  - Ainda oferece opção "WRITE" no dropdown
  - Cor verde para WRITE

---

### 2.5 🟣 MIDDLEWARE DEPRECATED (mas ainda ativo)

#### `src/lib/middleware/permissionMiddleware.ts`
- **40+ ocorrências** de `action: 'WRITE'`
- Este arquivo está marcado como DEPRECATED mas pode ainda estar sendo usado
- Linhas 32-300: Mapeamentos de rotas com WRITE

---

### 2.6 📁 BANCO DE DADOS

#### A. Migrations Antigas
- `database/migrations/004_populate_route_permissions_config.sql` (4x WRITE)
- `database/migrations/011_popular_rotas_crud_simples.sql` (16x WRITE)
- `database/migrations/001_create_route_permissions_config.sql` (constraint permite WRITE)

#### B. Schemas
- `database/schema.sql` - Constraint CHECK permite 'WRITE'
- `database/create_sidebar_tables.sql` - Comentários mencionam WRITE

#### C. Scripts de Seed/Teste
- `database/seed.sql` (6x WRITE)
- `database/TESTE_PERMISSOES_SYSTEM_FEATURES.sql` (4x WRITE)
- `database/remove-cargo-field.sql` (3x WRITE)

---

## 🎯 RESUMO EXECUTIVO

### 📊 Estatísticas
- **Total de ocorrências**: 129
- **Legítimas (OK)**: ~20
- **Precisam correção**: ~109

### 🚨 Prioridades

**P1 - CRÍTICO (Bloqueia funcionamento):**
1. ✅ `src/lib/database/userPermissions.ts` - **USADO ATIVAMENTE**
2. ✅ `src/lib/permissions/PermissionChecker.ts` - **MIDDLEWARE PRINCIPAL**
3. ✅ `src/lib/middleware/UnifiedPermissionMiddleware.ts`

**P2 - ALTO (Afeta usuários):**
4. 🔴 Páginas frontend (tipos-imoveis, proprietarios, clientes)
5. 🔴 APIs de imóveis
6. 🔴 `src/components/admin/PermissoesEditor.tsx` - Dropdown de permissões

**P3 - MÉDIO (Funcionalidades secundárias):**
7. 🟠 APIs de perfis
8. 🟠 API de login (mapeamento)
9. 🟠 `src/lib/admin/auth.ts`

**P4 - BAIXO (Legado/Deprecated):**
10. 🟡 `src/lib/middleware/permissionMiddleware.ts` (DEPRECATED)
11. 🟡 Migrations antigas (já executadas)
12. 🟡 Scripts de teste/seed

---

## ⚡ RECOMENDAÇÃO

### Abordagem Sugerida:
1. **Fase 1**: Corrigir P1 (core do sistema)
2. **Fase 2**: Corrigir P2 (interface do usuário)
3. **Fase 3**: Corrigir P3 (APIs secundárias)
4. **Fase 4**: Limpar P4 (legado/documentação)

### ⚠️ ATENÇÃO ESPECIAL:
- `src/lib/database/userPermissions.ts` é CRÍTICO - usado por toda a aplicação
- `src/components/admin/PermissoesEditor.tsx` afeta diretamente a UI de gestão de permissões



