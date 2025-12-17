# 🛡️ Sistema Centralizado de Permissões

**Data:** 2025-10-29  
**Status:** ✅ Ativo

---

## 📋 ARQUIVOS

### **Principais:**
- `PermissionChecker.ts` - Funções de verificação de permissão
- `UnifiedPermissionMiddleware.ts` - Middleware único
- `PermissionTypes.ts` - Tipos TypeScript
- `index.ts` - Exports centralizados

---

## 🚀 USO

### **1. Verificar Permissão (Async)**

```typescript
import { checkUserPermission } from '@/lib/permissions'

const hasAccess = await checkUserPermission(
  userId,
  'imoveis',  // slug da funcionalidade
  'WRITE'     // ação necessária
)

if (hasAccess) {
  // Usuário pode criar/editar imóveis
}
```

### **2. Buscar Mapa de Permissões**

```typescript
import { getUserPermissionsMap } from '@/lib/permissions'

const permissions = await getUserPermissionsMap(userId)
// { 'imoveis': 'WRITE', 'clientes': 'READ', ... }
```

### **3. Usar no Middleware**

```typescript
import { unifiedPermissionMiddleware } from '@/lib/permissions'

export async function middleware(request: NextRequest) {
  const permissionCheck = await unifiedPermissionMiddleware(request)
  if (permissionCheck) return permissionCheck
  
  // Continuar...
}
```

---

## 🔄 FLUXO

```
Requisição
  ↓
Middleware busca rota em route_permissions_config
  ↓
Identifica feature_slug e default_action
  ↓
PermissionChecker verifica em role_permissions
  ↓
✅ Permitir ou ❌ Negar
```

---

## 📊 INTEGRAÇÃO COM BANCO

```
user_role_assignments
  ↓
role_permissions (tabela chave!)
  ↓
permissions
  ↓
system_features (com slug)
  ↑
route_permissions_config
```

---

## ⚡ PERFORMANCE

- Cache de rotas (5 min TTL)
- Queries otimizadas com índices
- Fail-safe em caso de erro

---

## 🛡️ SEGURANÇA

- Zero hardcoding
- Baseado 100% no banco
- Logs de acesso negado
- Fail-safe: erro = negar acesso



