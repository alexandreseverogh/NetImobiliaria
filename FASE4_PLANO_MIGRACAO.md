# 📋 FASE 4 - PLANO DE MIGRAÇÃO DAS APIs

**Data:** 29/10/2025  
**Status:** 🔄 EM ANDAMENTO

---

## 🎯 ESTRATÉGIA DE MIGRAÇÃO

### **Ordem (do mais seguro para o mais crítico):**

1. ✅ **APIs de Teste** (baixo risco)
2. ⏳ **APIs Administrativas** (médio risco)
3. ⏳ **APIs de CRUD Simples** (médio risco)
4. ⏳ **APIs de Usuários** (alto risco)
5. ⏳ **APIs de Alto Tráfego** (muito alto risco)

---

## 📊 INVENTÁRIO DE APIs

**Total:** ~65 rotas de API

### **Grupo 1: APIs de Teste (3 rotas)**
- [ ] `/api/test-permissions` (já criada)
- [ ] `/api/admin/tipos-documentos/*` (3 rotas)

### **Grupo 2: APIs Administrativas (15 rotas)**
- [ ] `/api/admin/roles/*` (8 rotas)
- [ ] `/api/admin/permissions` (1 rota)
- [ ] `/api/admin/system-features/*` (3 rotas)
- [ ] `/api/admin/categorias/*` (3 rotas)

### **Grupo 3: APIs de CRUD Simples (20 rotas)**
- [ ] `/api/admin/amenidades/*` (4 rotas)
- [ ] `/api/admin/proximidades/*` (4 rotas)
- [ ] `/api/admin/categorias-amenidades/*` (4 rotas)
- [ ] `/api/admin/categorias-proximidades/*` (4 rotas)
- [ ] `/api/admin/tipos-imoveis/*` (2 rotas)
- [ ] `/api/admin/finalidades/*` (2 rotas)

### **Grupo 4: APIs Críticas (12 rotas)**
- [ ] `/api/admin/usuarios/*` (8 rotas)
- [ ] `/api/admin/sessions/*` (4 rotas)

### **Grupo 5: APIs de Alto Tráfego (15 rotas)**
- [ ] `/api/admin/imoveis/*` (10 rotas)
- [ ] `/api/admin/clientes/*` (3 rotas)
- [ ] `/api/admin/proprietarios/*` (2 rotas)

---

## 🔄 PADRÃO DE MIGRAÇÃO

### **ANTES:**
```typescript
import { checkApiPermission } from '@/lib/middleware/permissionMiddleware'

export async function GET(request: NextRequest) {
  const permissionCheck = await checkApiPermission(request)
  if (permissionCheck) return permissionCheck
  
  // ... lógica ...
}
```

### **DEPOIS:**
```typescript
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

export async function GET(request: NextRequest) {
  const permissionCheck = await unifiedPermissionMiddleware(request)
  if (permissionCheck) return permissionCheck
  
  // ... lógica ... (sem alterações)
}
```

---

## ✅ PROGRESSO

- [x] GRUPO 1 - Teste
- [ ] GRUPO 2 - Administrativas
- [ ] GRUPO 3 - CRUD Simples
- [ ] GRUPO 4 - Críticas
- [ ] GRUPO 5 - Alto Tráfego



