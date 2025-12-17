# 🔧 PROPOSTA: SISTEMA DE PERMISSÕES 100% DINÂMICO

## 🎯 **OBJETIVO:**
Eliminar completamente o hardcoding e tornar o sistema de permissões totalmente dinâmico baseado no banco de dados.

## ❌ **PROBLEMAS ATUAIS:**

### 1. **Hardcoding no Middleware**
```typescript
// ❌ PROBLEMA: 100+ linhas hardcoded
const routePermissions: Record<string, PermissionConfig> = {
  '/admin/imoveis': { resource: 'imoveis', action: 'READ' },
  '/api/admin/categorias': { resource: 'system-features', action: 'READ' },
  // ... mais 100+ linhas
}
```

### 2. **Hardcoding no Mapeamento**
```typescript
// ❌ PROBLEMA: 40+ linhas hardcoded
const featureMapping: { [key: string]: string } = {
  'Categorias de Funcionalidades': 'system-features',
  'Imóveis': 'imoveis',
  // ... mais 40+ linhas
}
```

## ✅ **SOLUÇÃO PROPOSTA:**

### 1. **Sistema Dinâmico de Rotas**
```typescript
// ✅ SOLUÇÃO: Buscar rotas do banco
async function getRoutePermissions(): Promise<Record<string, PermissionConfig>> {
  const query = `
    SELECT 
      sf.url as route,
      sf.name as resource_name,
      CASE 
        WHEN sf."Crud_Execute" = 'CRUD' THEN 'READ'
        WHEN sf."Crud_Execute" = 'EXECUTE' THEN 'EXECUTE'
        ELSE 'READ'
      END as default_action
    FROM system_features sf
    WHERE sf.is_active = true
  `
  // Converter para formato esperado pelo middleware
}
```

### 2. **Mapeamento Dinâmico**
```typescript
// ✅ SOLUÇÃO: Usar nome da funcionalidade diretamente
function mapFeatureToResource(funcionalidade: string): string {
  // Usar slug ou nome normalizado da própria funcionalidade
  return funcionalidade.toLowerCase().replace(/\s+/g, '-')
}
```

### 3. **Middleware Dinâmico**
```typescript
// ✅ SOLUÇÃO: Carregar permissões dinamicamente
export async function checkApiPermission(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  
  // Buscar configuração dinamicamente do banco
  const permissionConfig = await getPermissionConfigFromDB(pathname)
  
  if (!permissionConfig) {
    return null // Rota não precisa de verificação
  }
  
  // Verificar permissão usando sistema dinâmico
  const hasPermission = await userHasPermission(
    decoded.userId, 
    permissionConfig.resource, 
    permissionConfig.action
  )
}
```

## 🚀 **BENEFÍCIOS:**

### ✅ **Manutenibilidade**
- ❌ **ANTES**: Adicionar nova funcionalidade = 3 lugares para alterar
- ✅ **DEPOIS**: Adicionar nova funcionalidade = apenas banco de dados

### ✅ **Escalabilidade**
- ❌ **ANTES**: Sistema limitado por hardcoding
- ✅ **DEPOIS**: Sistema ilimitado, baseado no banco

### ✅ **Consistência**
- ❌ **ANTES**: Risco de inconsistências entre código e banco
- ✅ **DEPOIS**: Fonte única de verdade (banco de dados)

### ✅ **Flexibilidade**
- ❌ **ANTES**: Mudanças requerem deploy
- ✅ **DEPOIS**: Mudanças em tempo real via banco

## 📊 **IMPLEMENTAÇÃO:**

### **FASE 1**: Criar tabela de configuração de rotas
```sql
CREATE TABLE route_permissions_config (
  id SERIAL PRIMARY KEY,
  route_pattern VARCHAR(255) NOT NULL,
  resource_name VARCHAR(255) NOT NULL,
  default_action VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **FASE 2**: Migrar configurações existentes
```sql
INSERT INTO route_permissions_config (route_pattern, resource_name, default_action)
SELECT 
  sf.url,
  sf.name,
  CASE WHEN sf."Crud_Execute" = 'CRUD' THEN 'READ' ELSE 'EXECUTE' END
FROM system_features sf
WHERE sf.is_active = true;
```

### **FASE 3**: Refatorar middleware para usar banco
### **FASE 4**: Remover hardcoding
### **FASE 5**: Testes e validação

## 🎯 **RESULTADO FINAL:**

**Sistema 100% dinâmico onde:**
- ✅ Novas funcionalidades = apenas banco de dados
- ✅ Zero hardcoding
- ✅ Configuração em tempo real
- ✅ Manutenção simplificada
- ✅ Escalabilidade ilimitada

## ❓ **PERGUNTA:**

**Você gostaria que eu implemente essa solução 100% dinâmica?**

Isso eliminaria completamente o problema de hardcoding e tornaria o sistema muito mais flexível e manutenível.
