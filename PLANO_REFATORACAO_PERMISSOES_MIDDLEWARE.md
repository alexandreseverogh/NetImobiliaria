# 🎯 PLANO MINUCIOSO DE REFATORAÇÃO: PERMISSÕES, MIDDLEWARE E MAPEAMENTO

**Data:** 29/10/2025  
**Objetivo:** Eliminar 100% hardcoding e centralizar sistema de permissões  
**Metodologia:** Gradual, incremental, testável e com rollback garantido  
**Alinhamento:** 100% conforme GUARDIAN RULES 🛡️

---

## 📋 ÍNDICE

1. [Análise do Estado Atual](#análise-do-estado-atual)
2. [Problemas Identificados](#problemas-identificados)
3. [Objetivo da Refatoração](#objetivo-da-refatoração)
4. [Arquitetura Proposta](#arquitetura-proposta)
5. [Plano de Execução Detalhado](#plano-de-execução-detalhado)
6. [Cronograma e Checkpoints](#cronograma-e-checkpoints)
7. [Estratégia de Rollback](#estratégia-de-rollback)
8. [Testes Obrigatórios](#testes-obrigatórios)

---

## 🔍 ANÁLISE DO ESTADO ATUAL

### **1. ESTRUTURA DO BANCO DE DADOS**

#### **Tabelas Principais:**

```sql
-- Perfis com hierarquia
user_roles (
    id, name, description, level, 
    is_system_role, requires_2fa, is_active
)

-- Funcionalidades do sistema
system_features (
    id, name, description, url, icon, category,
    parent_id, order_index, is_active, 
    requires_permission, requires_2fa
)

-- Permissões específicas
permissions (
    id, feature_id, action, description,
    is_system_permission
)

-- Associação perfil-permissão
role_permissions (
    id, role_id, permission_id, 
    granted_by, granted_at
)

-- Associação usuário-perfil
user_role_assignments (
    id, user_id, role_id,
    assigned_by, assigned_at, expires_at
)

-- Menu da sidebar
sidebar_menu_items (
    id, parent_id, name, icon_name, url,
    resource, roles_required (JSONB),
    order_index, is_active
)
```

#### **Relacionamentos Atuais:**

```
users → user_role_assignments → user_roles
user_roles → role_permissions → permissions → system_features
sidebar_menu_items → resource (string literal)
```

---

### **2. CÓDIGO ATUAL**

#### **A. Middleware de Permissões**

**Arquivo:** `src/lib/middleware/permissionMiddleware.ts`

```typescript
// ❌ PROBLEMA: 165 linhas hardcoded
const routePermissions: Record<string, PermissionConfig> = {
  '/admin/imoveis': { resource: 'imoveis', action: 'READ' },
  '/admin/imoveis/novo': { resource: 'imoveis', action: 'WRITE' },
  '/api/admin/imoveis': { resource: 'imoveis', action: 'READ' },
  '/api/admin/imoveis/create': { resource: 'imoveis', action: 'WRITE' },
  // ... mais 160+ linhas ...
}
```

**Análise:**
- ✅ **Positivo:** Usa `userHasPermission()` que consulta banco
- ❌ **Negativo:** Mapeamento de rotas completamente hardcoded
- ❌ **Negativo:** Toda nova rota requer alteração manual no código
- ❌ **Negativo:** Risco de inconsistência entre código e banco

---

#### **B. Mapeamento de Funcionalidades**

**Arquivo:** `src/lib/database/userPermissions.ts`

```typescript
// ❌ PROBLEMA: 46 linhas hardcoded
function mapFeatureToResource(funcionalidade: string): string {
  const featureMapping: { [key: string]: string } = {
    'Categorias de Funcionalidades': 'system-features',
    'Funcionalidades do Sistema': 'system-features',
    'Gestão de Perfis': 'roles',
    'Usuários': 'usuarios',
    'Imóveis': 'imoveis',
    'Clientes': 'clientes',
    // ... mais 40+ linhas ...
  }
  return featureMapping[funcionalidade] || funcionalidade.toLowerCase().replace(/\s+/g, '-')
}
```

**Análise:**
- ✅ **Positivo:** Tem fallback automático
- ❌ **Negativo:** Mapeamento completamente hardcoded
- ❌ **Negativo:** Nomes duplicados/inconsistentes
- ❌ **Negativo:** Dificulta manutenção

---

#### **C. Sidebar Menu**

**Arquivo:** `database/populate_sidebar_menu.sql`

```sql
-- ❌ PROBLEMA: Hardcoding de perfis permitidos
INSERT INTO sidebar_menu_items (name, resource, roles_required) 
VALUES (
    'Painel do Sistema',
    'system-panel',
    '["Super Admin", "Administrador"]'::jsonb  -- HARDCODED!
);
```

**Análise:**
- ✅ **Positivo:** Estrutura hierárquica bem definida
- ❌ **Negativo:** `roles_required` hardcoded como JSONB
- ❌ **Negativo:** `resource` não vinculado a `system_features`
- ❌ **Negativo:** Dificulta mudança dinâmica de permissões

---

#### **D. Redundâncias Identificadas**

**1. Múltiplos Middleware:**
- `src/lib/middleware/permissionMiddleware.ts` - Principal
- `src/middleware/authMiddleware.ts` - Alternativo
- `src/lib/middleware/apiAuth.ts` - Simplificado

**2. Funções Duplicadas de Verificação:**
- `userHasPermission()` em `src/lib/database/users.ts` (linhas 361-392)
- `userHasPermission()` em `src/lib/database/userPermissions.ts` (linhas 73-91)
- `checkUserPermissions()` em `src/middleware/authMiddleware.ts` (linhas 168-190)

**3. Mapeamentos Duplicados:**
- `mapFeatureToResource()` em código TypeScript
- Lógica similar em scripts de teste JavaScript

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### **CATEGORIA 1: HARDCODING CRÍTICO**

| # | Problema | Arquivo | Linhas | Impacto |
|---|----------|---------|--------|---------|
| 1 | Mapeamento de rotas hardcoded | `permissionMiddleware.ts` | 11-176 | 🔴 Alto |
| 2 | Mapeamento de funcionalidades hardcoded | `userPermissions.ts` | 160-206 | 🔴 Alto |
| 3 | Roles na sidebar hardcoded | `populate_sidebar_menu.sql` | Todo | 🟡 Médio |
| 4 | Verificação "Super Admin" hardcoded | `roles/[id]/permissions/route.ts` | 43-44 | 🟡 Médio |

### **CATEGORIA 2: REDUNDÂNCIAS**

| # | Problema | Arquivos Envolvidos | Impacto |
|---|----------|---------------------|---------|
| 1 | 3 middleware de autenticação diferentes | `permissionMiddleware.ts`, `authMiddleware.ts`, `apiAuth.ts` | 🟡 Médio |
| 2 | 3 funções de verificação de permissão | `users.ts`, `userPermissions.ts`, `authMiddleware.ts` | 🟡 Médio |
| 3 | Lógica de mapeamento duplicada | Vários arquivos `.ts` e `.js` | 🟢 Baixo |

### **CATEGORIA 3: FALTA DE NORMALIZAÇÃO**

| # | Problema | Descrição | Impacto |
|---|----------|-----------|---------|
| 1 | Sidebar sem FK para `system_features` | Campo `resource` é string literal | 🟡 Médio |
| 2 | `roles_required` como JSONB | Deveria ser tabela M:N | 🟡 Médio |
| 3 | Sem campo `slug` em `system_features` | Usa `name` para mapeamento | 🟢 Baixo |

### **CATEGORIA 4: MANUTENIBILIDADE**

| # | Problema | Descrição | Impacto |
|---|----------|-----------|---------|
| 1 | Nova funcionalidade = 4 lugares para alterar | Código, banco, middleware, mapeamento | 🔴 Alto |
| 2 | Difícil rastreabilidade | Mudanças dispersas | 🟡 Médio |
| 3 | Risco de inconsistências | Código vs banco | 🟡 Médio |

---

## 🎯 OBJETIVO DA REFATORAÇÃO

### **PRINCÍPIOS FUNDAMENTAIS:**

1. **🚫 ZERO HARDCODING**
   - Todas as rotas definidas no banco
   - Todos os mapeamentos definidos no banco
   - Todas as permissões gerenciadas pelo banco

2. **🔄 CENTRALIZAÇÃO TOTAL**
   - Um único middleware de permissões
   - Uma única função de verificação de permissão
   - Um único sistema de mapeamento

3. **📊 BANCO COMO FONTE ÚNICA DE VERDADE**
   - Código apenas consulta e aplica
   - Configuração 100% no banco de dados
   - Mudanças em tempo real sem deploy

4. **🔧 REUSABILIDADE**
   - Funções genéricas com parâmetros
   - Zero duplicação de lógica
   - Fácil extensibilidade

5. **🛡️ SEGURANÇA E AUDITORIA**
   - Manter todos os `granted_by`, `assigned_by`
   - Logs completos de mudanças
   - Rastreabilidade total

---

## 🏗️ ARQUITETURA PROPOSTA

### **1. NOVAS TABELAS DO BANCO DE DADOS**

#### **A. Tabela de Configuração de Rotas**

```sql
CREATE TABLE route_permissions_config (
    id SERIAL PRIMARY KEY,
    route_pattern VARCHAR(255) NOT NULL UNIQUE,
    method VARCHAR(10) DEFAULT 'GET', -- GET, POST, PUT, DELETE
    feature_id INTEGER REFERENCES system_features(id) ON DELETE CASCADE,
    default_action VARCHAR(20) NOT NULL, -- READ, WRITE, DELETE, ADMIN
    requires_auth BOOLEAN DEFAULT true,
    requires_2fa BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    CONSTRAINT unique_route_method UNIQUE(route_pattern, method)
);

-- Índices para performance
CREATE INDEX idx_route_config_pattern ON route_permissions_config(route_pattern);
CREATE INDEX idx_route_config_feature ON route_permissions_config(feature_id);
CREATE INDEX idx_route_config_active ON route_permissions_config(is_active);

-- Comentário
COMMENT ON TABLE route_permissions_config IS 
    'Configuração dinâmica de permissões por rota - elimina hardcoding';
```

**Propósito:**
- ✅ Substituir `routePermissions` hardcoded
- ✅ Vincular rotas a `system_features`
- ✅ Permitir configuração dinâmica

---

#### **B. Adicionar campo `slug` em `system_features`**

```sql
-- Adicionar coluna slug
ALTER TABLE system_features 
ADD COLUMN slug VARCHAR(100) UNIQUE;

-- Popular slug baseado no name existente
UPDATE system_features 
SET slug = LOWER(REPLACE(REPLACE(name, ' ', '-'), 'ç', 'c'));

-- Tornar obrigatório
ALTER TABLE system_features 
ALTER COLUMN slug SET NOT NULL;

-- Índice
CREATE INDEX idx_system_features_slug ON system_features(slug);

-- Comentário
COMMENT ON COLUMN system_features.slug IS 
    'Identificador único normalizado para uso em código - elimina mapFeatureToResource';
```

**Propósito:**
- ✅ Substituir `mapFeatureToResource()` hardcoded
- ✅ Identificador consistente e único
- ✅ Facilita queries e joins

---

#### **C. Normalizar sidebar com FK**

```sql
-- Adicionar FK para system_features
ALTER TABLE sidebar_menu_items 
ADD COLUMN feature_id INTEGER REFERENCES system_features(id) ON DELETE SET NULL;

-- Popular FK baseado no resource existente
UPDATE sidebar_menu_items smi
SET feature_id = (
    SELECT id FROM system_features sf 
    WHERE sf.slug = smi.resource
    LIMIT 1
);

-- Criar tabela M:N para roles permitidas
CREATE TABLE sidebar_item_roles (
    id SERIAL PRIMARY KEY,
    sidebar_item_id INTEGER REFERENCES sidebar_menu_items(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES user_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    UNIQUE(sidebar_item_id, role_id)
);

-- Índices
CREATE INDEX idx_sidebar_roles_item ON sidebar_item_roles(sidebar_item_id);
CREATE INDEX idx_sidebar_roles_role ON sidebar_item_roles(role_id);

-- Popular tabela M:N baseado no JSONB atual
INSERT INTO sidebar_item_roles (sidebar_item_id, role_id)
SELECT 
    smi.id,
    ur.id
FROM sidebar_menu_items smi
CROSS JOIN LATERAL jsonb_array_elements_text(smi.roles_required) AS role_name
JOIN user_roles ur ON ur.name = role_name;

-- Remover coluna JSONB antiga (após validação)
-- ALTER TABLE sidebar_menu_items DROP COLUMN roles_required;
-- ALTER TABLE sidebar_menu_items DROP COLUMN resource;

COMMENT ON TABLE sidebar_item_roles IS 
    'Associação M:N entre itens da sidebar e perfis - substitui JSONB hardcoded';
```

**Propósito:**
- ✅ Normalizar estrutura do banco
- ✅ Eliminar JSONB hardcoded
- ✅ Facilitar queries e manutenção
- ✅ Vincular sidebar a `system_features`

---

### **2. FUNÇÕES CENTRALIZADAS**

#### **A. Função Única de Verificação de Permissão**

**Arquivo:** `src/lib/permissions/PermissionChecker.ts` (NOVO)

```typescript
import pool from '@/lib/database/connection'

/**
 * FUNÇÃO CENTRALIZADA DE VERIFICAÇÃO DE PERMISSÃO
 * Substitui todas as funções duplicadas
 */
export async function checkUserPermission(
  userId: string,
  featureSlug: string,
  requiredAction: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
): Promise<boolean> {
  try {
    // Mapear ação para permissões do banco
    const actionMap: Record<string, string[]> = {
      'READ': ['read', 'list'],
      'WRITE': ['create', 'update', 'write', 'read', 'list'],
      'DELETE': ['delete', 'create', 'update', 'write', 'read', 'list'],
      'ADMIN': ['admin', 'delete', 'create', 'update', 'write', 'read', 'list']
    }
    
    const allowedActions = actionMap[requiredAction]
    
    // Query única e otimizada
    const query = `
      SELECT 1
      FROM user_role_assignments ura
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE ura.user_id = $1
        AND ura.is_active = true
        AND sf.slug = $2
        AND sf.is_active = true
        AND p.action = ANY($3)
      LIMIT 1
    `
    
    const result = await pool.query(query, [userId, featureSlug, allowedActions])
    return result.rows.length > 0
  } catch (error) {
    console.error('❌ Erro ao verificar permissão:', error)
    return false
  }
}

/**
 * Busca permissões completas do usuário
 * Retorna mapa de slug => nível de permissão
 */
export async function getUserPermissionsMap(userId: string): Promise<Record<string, string>> {
  try {
    const query = `
      SELECT 
        sf.slug,
        MAX(
          CASE 
            WHEN p.action IN ('admin') THEN 4
            WHEN p.action IN ('delete', 'export') THEN 3
            WHEN p.action IN ('create', 'update', 'write', 'execute') THEN 2
            WHEN p.action IN ('read', 'list') THEN 1
            ELSE 0
          END
        ) as permission_level
      FROM user_role_assignments ura
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE ura.user_id = $1
        AND ura.is_active = true
        AND sf.is_active = true
      GROUP BY sf.slug
    `
    
    const result = await pool.query(query, [userId])
    
    const permissionsMap: Record<string, string> = {}
    result.rows.forEach(row => {
      const levelMap: Record<number, string> = {
        1: 'READ',
        2: 'WRITE',
        3: 'DELETE',
        4: 'ADMIN'
      }
      permissionsMap[row.slug] = levelMap[row.permission_level] || 'READ'
    })
    
    return permissionsMap
  } catch (error) {
    console.error('❌ Erro ao buscar mapa de permissões:', error)
    return {}
  }
}
```

---

#### **B. Middleware Unificado**

**Arquivo:** `src/lib/middleware/UnifiedPermissionMiddleware.ts` (NOVO)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { checkUserPermission } from '@/lib/permissions/PermissionChecker'
import pool from '@/lib/database/connection'

/**
 * MIDDLEWARE UNIFICADO DE PERMISSÕES
 * Substitui todos os middleware existentes
 */
export async function unifiedPermissionMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const { pathname, method } = request.nextUrl
  
  // 1. Buscar configuração da rota no banco
  const routeConfig = await getRouteConfig(pathname, method)
  
  // Se rota não configurada, permitir (rotas públicas/não protegidas)
  if (!routeConfig || !routeConfig.requires_auth) {
    return null
  }
  
  // 2. Verificar autenticação
  const token = extractToken(request)
  if (!token) {
    return NextResponse.json(
      { error: 'Autenticação necessária' },
      { status: 401 }
    )
  }
  
  const decoded = await verifyToken(token)
  if (!decoded) {
    return NextResponse.json(
      { error: 'Token inválido ou expirado' },
      { status: 401 }
    )
  }
  
  // 3. Verificar permissão usando sistema unificado
  const hasPermission = await checkUserPermission(
    decoded.userId,
    routeConfig.feature_slug,
    routeConfig.default_action
  )
  
  if (!hasPermission) {
    return NextResponse.json(
      { 
        error: 'Permissão insuficiente',
        required: {
          feature: routeConfig.feature_slug,
          action: routeConfig.default_action
        }
      },
      { status: 403 }
    )
  }
  
  // 4. Verificar 2FA se necessário
  if (routeConfig.requires_2fa && !decoded.twoFAVerified) {
    return NextResponse.json(
      { error: 'Verificação 2FA necessária' },
      { status: 403 }
    )
  }
  
  // Permissão concedida
  return null
}

/**
 * Busca configuração da rota no banco de dados
 */
async function getRouteConfig(pathname: string, method: string) {
  try {
    // Cache em memória (renovar a cada 5 minutos)
    const cacheKey = `${pathname}:${method}`
    if (routeConfigCache.has(cacheKey)) {
      const cached = routeConfigCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.config
      }
    }
    
    const query = `
      SELECT 
        rpc.route_pattern,
        rpc.method,
        rpc.default_action,
        rpc.requires_auth,
        rpc.requires_2fa,
        sf.slug as feature_slug,
        sf.name as feature_name
      FROM route_permissions_config rpc
      JOIN system_features sf ON rpc.feature_id = sf.id
      WHERE rpc.is_active = true
        AND sf.is_active = true
        AND (
          rpc.route_pattern = $1  -- Match exato
          OR $1 ~ ('^' || REPLACE(rpc.route_pattern, '[id]', '[^/]+') || '$')  -- Match com regex
        )
        AND rpc.method = $2
      LIMIT 1
    `
    
    const result = await pool.query(query, [pathname, method])
    
    if (result.rows.length === 0) {
      return null
    }
    
    const config = result.rows[0]
    
    // Atualizar cache
    routeConfigCache.set(cacheKey, {
      config,
      timestamp: Date.now()
    })
    
    return config
  } catch (error) {
    console.error('❌ Erro ao buscar configuração de rota:', error)
    return null
  }
}

/**
 * Extrai token da requisição
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '')
  }
  
  return request.cookies.get('accessToken')?.value || null
}

// Cache em memória para configurações de rota
const routeConfigCache = new Map<string, { config: any; timestamp: number }>()

// Limpar cache a cada 5 minutos
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of routeConfigCache.entries()) {
    if (now - value.timestamp > 5 * 60 * 1000) {
      routeConfigCache.delete(key)
    }
  }
}, 5 * 60 * 1000)
```

---

### **3. ESTRUTURA DE PASTAS PROPOSTA**

```
src/
├── lib/
│   ├── permissions/                    # NOVO: Sistema centralizado
│   │   ├── PermissionChecker.ts       # Função única de verificação
│   │   ├── PermissionTypes.ts         # Tipos TypeScript
│   │   └── PermissionCache.ts         # Sistema de cache
│   │
│   ├── middleware/                     # Middleware unificado
│   │   ├── UnifiedPermissionMiddleware.ts  # NOVO: Middleware único
│   │   ├── permissionMiddleware.ts    # DEPRECAR
│   │   └── apiAuth.ts                 # DEPRECAR
│   │
│   ├── database/
│   │   ├── connection.ts
│   │   ├── RouteConfigRepository.ts   # NOVO: Repo para rotas
│   │   ├── userPermissions.ts         # REFATORAR: Usar PermissionChecker
│   │   └── users.ts                   # REFATORAR: Remover duplicação
│   │
│   └── auth/
│       └── jwt.ts
│
└── middleware/                         # Root middleware
    ├── authMiddleware.ts              # DEPRECAR
    └── environmentMiddleware.ts

database/
├── migrations/
│   ├── 001_add_route_permissions_config.sql      # NOVO
│   ├── 002_add_slug_to_system_features.sql       # NOVO
│   ├── 003_normalize_sidebar_with_fk.sql         # NOVO
│   └── 004_populate_route_config.sql             # NOVO
│
└── rollback/
    ├── 001_rollback_route_permissions_config.sql # NOVO
    ├── 002_rollback_slug.sql                     # NOVO
    └── 003_rollback_sidebar_normalization.sql    # NOVO
```

---

## 📅 PLANO DE EXECUÇÃO DETALHADO

### **FASE 1: ANÁLISE E PREPARAÇÃO** ✅ (CONCLUÍDA)

#### **Objetivo:** Mapear completamente o estado atual

**Tarefas:**
- [x] Analisar estrutura do banco de dados
- [x] Identificar todos os pontos de hardcoding
- [x] Identificar todas as redundâncias
- [x] Mapear todos os arquivos envolvidos
- [x] Criar documento de análise completo

**Duração:** ✅ Concluído

---

### **FASE 2: PROJETO DO BANCO DE DADOS**

#### **Objetivo:** Criar estrutura para armazenar configurações dinâmicas

**Checkpoint:** `checkpoint_fase2_estrutura_banco`

#### **Passo 2.1: Criar tabela `route_permissions_config`**

**Arquivo:** `database/migrations/001_add_route_permissions_config.sql`

**Tarefas:**
- [ ] Criar tabela com todos os campos
- [ ] Criar índices para performance
- [ ] Criar triggers para `updated_at`
- [ ] Adicionar comentários explicativos
- [ ] Testar estrutura vazia

**Script de Rollback:** `database/rollback/001_rollback_route_permissions_config.sql`

**Validação:**
```sql
-- Verificar estrutura
\d route_permissions_config

-- Verificar índices
\di *route_config*

-- Verificar triggers
SELECT * FROM pg_trigger WHERE tgname LIKE '%route_config%';
```

**Duração Estimada:** 1 hora

---

#### **Passo 2.2: Adicionar campo `slug` em `system_features`**

**Arquivo:** `database/migrations/002_add_slug_to_system_features.sql`

**Tarefas:**
- [ ] Adicionar coluna `slug VARCHAR(100)`
- [ ] Popular slug com função normalizada
- [ ] Tornar coluna obrigatória e única
- [ ] Criar índice
- [ ] Validar todos os slugs

**Script de População:**
```sql
-- Função para normalizar nome em slug
CREATE OR REPLACE FUNCTION normalize_to_slug(text_input TEXT) 
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(text_input, ' ', '-'),
                    'ç', 'c'
                ),
                'ã', 'a'
            ),
            'õ', 'o'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Popular slugs
UPDATE system_features 
SET slug = normalize_to_slug(name);

-- Verificar duplicados antes de aplicar UNIQUE
SELECT slug, COUNT(*) 
FROM system_features 
GROUP BY slug 
HAVING COUNT(*) > 1;

-- Se houver duplicados, resolver manualmente antes de prosseguir
```

**Script de Rollback:** `database/rollback/002_rollback_slug.sql`

**Validação:**
```sql
-- Verificar se todos têm slug
SELECT COUNT(*) FROM system_features WHERE slug IS NULL;

-- Verificar unicidade
SELECT slug, COUNT(*) 
FROM system_features 
GROUP BY slug 
HAVING COUNT(*) > 1;

-- Mostrar mapeamento name → slug
SELECT id, name, slug FROM system_features ORDER BY name;
```

**Duração Estimada:** 2 horas (incluindo resolução de duplicados)

---

#### **Passo 2.3: Normalizar sidebar com FK**

**Arquivo:** `database/migrations/003_normalize_sidebar_with_fk.sql`

**Tarefas:**
- [ ] Adicionar `feature_id` em `sidebar_menu_items`
- [ ] Popular `feature_id` baseado em `resource`
- [ ] Criar tabela `sidebar_item_roles`
- [ ] Popular `sidebar_item_roles` do JSONB
- [ ] Validar dados migrados
- [ ] (Após validação) Deprecar colunas antigas

**Script de Rollback:** `database/rollback/003_rollback_sidebar_normalization.sql`

**Validação:**
```sql
-- Verificar FK populadas
SELECT 
    COUNT(*) as total,
    COUNT(feature_id) as com_feature,
    COUNT(*) - COUNT(feature_id) as sem_feature
FROM sidebar_menu_items;

-- Verificar dados migrados em sidebar_item_roles
SELECT 
    smi.name,
    COUNT(sir.role_id) as qtd_roles,
    STRING_AGG(ur.name, ', ') as roles
FROM sidebar_menu_items smi
LEFT JOIN sidebar_item_roles sir ON smi.id = sir.sidebar_item_id
LEFT JOIN user_roles ur ON sir.role_id = ur.id
GROUP BY smi.id, smi.name
ORDER BY smi.order_index;

-- Comparar com JSONB original
SELECT 
    name,
    roles_required
FROM sidebar_menu_items
ORDER BY order_index;
```

**Duração Estimada:** 3 horas

---

#### **Passo 2.4: Popular tabela `route_permissions_config`**

**Arquivo:** `database/migrations/004_populate_route_config.sql`

**Tarefas:**
- [ ] Mapear todas as rotas do `routePermissions` hardcoded
- [ ] Vincular cada rota ao `system_features` correspondente
- [ ] Definir `default_action` por rota
- [ ] Definir `requires_2fa` para rotas sensíveis
- [ ] Inserir dados na tabela
- [ ] Validar todas as inserções

**Script:**
```sql
-- Popular route_permissions_config baseado no hardcoding atual

-- GRUPO 1: Rotas de Imóveis
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth)
SELECT 
    route,
    method,
    sf.id,
    action,
    true
FROM (VALUES
    ('/admin/imoveis', 'GET', 'imoveis', 'READ'),
    ('/admin/imoveis/novo', 'GET', 'imoveis', 'WRITE'),
    ('/admin/imoveis/[id]/edicao', 'GET', 'imoveis', 'WRITE'),
    ('/api/admin/imoveis', 'GET', 'imoveis', 'READ'),
    ('/api/admin/imoveis', 'POST', 'imoveis', 'WRITE'),
    ('/api/admin/imoveis/[id]', 'GET', 'imoveis', 'READ'),
    ('/api/admin/imoveis/[id]', 'PUT', 'imoveis', 'WRITE'),
    ('/api/admin/imoveis/[id]', 'DELETE', 'imoveis', 'DELETE')
    -- ... mais rotas ...
) AS routes(route, method, slug, action)
JOIN system_features sf ON sf.slug = routes.slug;

-- GRUPO 2: Rotas de Usuários
-- ... continuar para todas as funcionalidades ...

-- GRUPO 3: Rotas Administrativas com 2FA
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa)
SELECT 
    route,
    method,
    sf.id,
    action,
    true,
    true  -- Exige 2FA
FROM (VALUES
    ('/api/admin/roles/[id]/permissions', 'PUT', 'roles', 'ADMIN'),
    ('/api/admin/usuarios/[id]/assign-role', 'POST', 'usuarios', 'ADMIN')
    -- ... rotas críticas ...
) AS routes(route, method, slug, action)
JOIN system_features sf ON sf.slug = routes.slug;
```

**Validação:**
```sql
-- Contar rotas configuradas
SELECT 
    method,
    COUNT(*) as quantidade
FROM route_permissions_config
GROUP BY method
ORDER BY method;

-- Verificar rotas sem feature vinculada (erro)
SELECT * FROM route_permissions_config WHERE feature_id IS NULL;

-- Mostrar rotas por funcionalidade
SELECT 
    sf.name as funcionalidade,
    rpc.method,
    rpc.route_pattern,
    rpc.default_action,
    rpc.requires_2fa
FROM route_permissions_config rpc
JOIN system_features sf ON rpc.feature_id = sf.id
ORDER BY sf.name, rpc.method, rpc.route_pattern;
```

**Duração Estimada:** 4 horas (mapear ~200 rotas)

---

**CHECKPOINT FASE 2:**

✅ **Critérios de Aprovação:**
- [ ] Todas as tabelas criadas sem erros
- [ ] Todos os índices funcionando
- [ ] Campo `slug` único e consistente
- [ ] Sidebar normalizada com FK
- [ ] Pelo menos 95% das rotas mapeadas em `route_permissions_config`
- [ ] Todos os scripts de rollback testados

**Testes:**
```bash
# Backup completo do banco antes de prosseguir
pg_dump -U postgres -d net_imobiliaria -F c -f backup_antes_fase3.backup

# Executar suite de validação
psql -U postgres -d net_imobiliaria -f database/validate_fase2.sql
```

**Duração Total da Fase 2:** 10 horas

---

### **FASE 3: CRIAR SISTEMA CENTRALIZADO**

#### **Objetivo:** Implementar funções centralizadas e eliminarde redundâncias

**Checkpoint:** `checkpoint_fase3_sistema_centralizado`

#### **Passo 3.1: Criar `PermissionChecker.ts`**

**Arquivo:** `src/lib/permissions/PermissionChecker.ts`

**Tarefas:**
- [ ] Criar função `checkUserPermission()` unificada
- [ ] Criar função `getUserPermissionsMap()` 
- [ ] Implementar cache inteligente
- [ ] Adicionar logs estruturados
- [ ] Adicionar tratamento de erros robusto
- [ ] Criar testes unitários

**Testes:**
```typescript
// test/PermissionChecker.test.ts
describe('PermissionChecker', () => {
  test('Deve retornar true para usuário com permissão READ', async () => {
    const result = await checkUserPermission('user-id', 'imoveis', 'READ')
    expect(result).toBe(true)
  })
  
  test('Deve retornar false para usuário sem permissão', async () => {
    const result = await checkUserPermission('user-id', 'usuarios', 'ADMIN')
    expect(result).toBe(false)
  })
  
  test('Deve cachear resultados corretamente', async () => {
    // ... teste de cache ...
  })
})
```

**Duração Estimada:** 4 horas

---

#### **Passo 3.2: Criar `UnifiedPermissionMiddleware.ts`**

**Arquivo:** `src/lib/middleware/UnifiedPermissionMiddleware.ts`

**Tarefas:**
- [ ] Implementar middleware unificado
- [ ] Integrar com `PermissionChecker`
- [ ] Implementar busca de configuração de rota do banco
- [ ] Implementar cache de configurações de rota
- [ ] Adicionar suporte a rotas dinâmicas ([id], [slug])
- [ ] Adicionar logs de auditoria
- [ ] Criar testes de integração

**Testes:**
```typescript
// test/UnifiedPermissionMiddleware.test.ts
describe('UnifiedPermissionMiddleware', () => {
  test('Deve permitir acesso com permissão válida', async () => {
    const request = createMockRequest('/api/admin/imoveis', 'GET', validToken)
    const response = await unifiedPermissionMiddleware(request)
    expect(response).toBeNull() // null = permitido
  })
  
  test('Deve negar acesso sem token', async () => {
    const request = createMockRequest('/api/admin/usuarios', 'GET')
    const response = await unifiedPermissionMiddleware(request)
    expect(response?.status).toBe(401)
  })
  
  test('Deve negar acesso sem permissão', async () => {
    const request = createMockRequest('/api/admin/usuarios', 'POST', tokenSemPermissao)
    const response = await unifiedPermissionMiddleware(request)
    expect(response?.status).toBe(403)
  })
  
  test('Deve exigir 2FA quando necessário', async () => {
    const request = createMockRequest('/api/admin/roles/1/permissions', 'PUT', tokenSem2FA)
    const response = await unifiedPermissionMiddleware(request)
    expect(response?.status).toBe(403)
    expect(await response?.json()).toMatchObject({ error: 'Verificação 2FA necessária' })
  })
})
```

**Duração Estimada:** 6 horas

---

#### **Passo 3.3: Refatorar Código Existente**

**Tarefas:**

**A. Refatorar `userPermissions.ts`:**
- [ ] Remover função `mapFeatureToResource()` hardcoded
- [ ] Usar `slug` do banco diretamente
- [ ] Remover função `userHasPermission()` (usar `PermissionChecker`)
- [ ] Atualizar `getUserPermissions()` para usar slugs
- [ ] Atualizar todos os imports

**B. Refatorar `users.ts`:**
- [ ] Remover função `userHasPermission()` duplicada
- [ ] Usar `PermissionChecker` importado
- [ ] Atualizar todos os locais que usam

**C. Deprecar `authMiddleware.ts`:**
- [ ] Adicionar aviso de deprecação
- [ ] Migrar código que ainda usa para `UnifiedPermissionMiddleware`
- [ ] Manter arquivo por segurança (não deletar)

**D. Deprecar `permissionMiddleware.ts` antigo:**
- [ ] Adicionar aviso de deprecação
- [ ] Renomear para `.deprecated.ts`
- [ ] Manter como backup

**Duração Estimada:** 4 horas

---

**CHECKPOINT FASE 3:**

✅ **Critérios de Aprovação:**
- [ ] `PermissionChecker.ts` 100% funcional
- [ ] `UnifiedPermissionMiddleware.ts` 100% funcional
- [ ] Todos os testes unitários passando
- [ ] Todos os testes de integração passando
- [ ] Zero importações dos arquivos antigos/duplicados
- [ ] Documentação atualizada

**Testes:**
```bash
# Executar suite de testes
npm test -- --coverage

# Verificar imports antigos
grep -r "from.*permissionMiddleware" src/
grep -r "from.*authMiddleware" src/
grep -r "mapFeatureToResource" src/

# Deve retornar vazio ou apenas arquivos .deprecated.ts
```

**Duração Total da Fase 3:** 14 horas

---

### **FASE 4: MIGRAÇÃO GRADUAL DAS APIS**

#### **Objetivo:** Migrar todas as APIs para usar novo sistema

**Checkpoint:** `checkpoint_fase4_apis_migradas`

#### **Estratégia de Migração:**

**Ordem de Prioridade:**
1. ✅ APIs de baixo tráfego (testes)
2. ✅ APIs administrativas
3. ✅ APIs de CRUD simples
4. ✅ APIs críticas (usuários, auth)
5. ✅ APIs de alto tráfego (imóveis, clientes)

---

#### **Passo 4.1: Migrar APIs de Teste**

**APIs:**
- `/api/admin/tipos-documentos`
- `/api/admin/categorias-amenidades`
- `/api/admin/categorias-proximidades`

**Padrão de Migração:**

```typescript
// ANTES (hardcoded):
import { checkApiPermission } from '@/lib/middleware/permissionMiddleware'

export async function GET(request: NextRequest) {
  // Hardcoding implícito via routePermissions
  const permissionCheck = await checkApiPermission(request)
  if (permissionCheck) return permissionCheck
  
  // ... lógica da API ...
}

// DEPOIS (dinâmico):
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

export async function GET(request: NextRequest) {
  // Busca permissão do banco via route_permissions_config
  const permissionCheck = await unifiedPermissionMiddleware(request)
  if (permissionCheck) return permissionCheck
  
  // ... lógica da API ... (sem alterações)
}
```

**Tarefas:**
- [ ] Migrar 3 APIs de teste
- [ ] Testar cada uma individualmente
- [ ] Validar logs de auditoria
- [ ] Comparar comportamento antes/depois
- [ ] Documentar qualquer diferença

**Duração Estimada:** 3 horas

---

#### **Passo 4.2: Migrar APIs Administrativas**

**APIs:**
- `/api/admin/roles/*`
- `/api/admin/permissions`
- `/api/admin/system-features/*`
- `/api/admin/categorias/*`
- `/api/admin/sidebar/*`

**Tarefas:**
- [ ] Migrar 15 rotas administrativas
- [ ] Testar gestão de perfis
- [ ] Testar gestão de permissões
- [ ] Testar sidebar dinâmica
- [ ] Validar logs de segurança
- [ ] Testar com diferentes perfis (Super Admin, Admin, Corretor)

**Validação:**
```bash
# Testar criação de perfil
curl -X POST http://localhost:3000/api/admin/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","level":2}'

# Testar atribuição de permissões
curl -X PUT http://localhost:3000/api/admin/roles/1/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permissionIds":[1,2,3]}'

# Verificar logs
psql -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;"
```

**Duração Estimada:** 6 horas

---

#### **Passo 4.3: Migrar APIs de CRUD Simples**

**APIs:**
- `/api/admin/amenidades/*`
- `/api/admin/proximidades/*`
- `/api/admin/tipos-imoveis/*`
- `/api/admin/finalidades/*`
- `/api/admin/status-imovel/*`

**Tarefas:**
- [ ] Migrar 25 rotas de CRUD
- [ ] Testar operações READ, WRITE, DELETE
- [ ] Validar PermissionGuards no frontend
- [ ] Testar com perfil Corretor (READ only)
- [ ] Validar comportamento de botões (aparecer/ocultar)

**Duração Estimada:** 5 horas

---

#### **Passo 4.4: Migrar APIs de Usuários e Auth**

**APIs:**
- `/api/admin/usuarios/*`
- `/api/admin/auth/*` (exceto login/logout)
- `/api/admin/sessions/*`

**⚠️ ATENÇÃO:** APIs críticas - testar extensivamente!

**Tarefas:**
- [ ] Migrar 18 rotas
- [ ] Testar criação de usuário
- [ ] Testar atribuição de perfis
- [ ] Testar 2FA
- [ ] Testar gestão de sessões
- [ ] Testar renovação de token
- [ ] Validar que login/logout continuam funcionando
- [ ] Testar com múltiplos perfis simultaneamente

**Validação Rigorosa:**
```bash
# Criar usuário
# Atribuir perfil
# Fazer login
# Testar acesso a recursos
# Validar sessão
# Renovar token
# Revogar sessão
# Validar que acesso foi bloqueado
```

**Duração Estimada:** 8 horas

---

#### **Passo 4.5: Migrar APIs de Alto Tráfego**

**APIs:**
- `/api/admin/imoveis/*` (~20 rotas)
- `/api/admin/clientes/*`
- `/api/admin/proprietarios/*`

**⚠️ ATENÇÃO:** APIs mais usadas - impacto direto nos usuários!

**Tarefas:**
- [ ] Migrar 30 rotas
- [ ] Testar CRUD de imóveis completo
- [ ] Testar upload de imagens/documentos
- [ ] Testar vídeos
- [ ] Testar rascunhos
- [ ] Testar histórico de status
- [ ] Testar amenidades e proximidades
- [ ] Monitorar performance (antes vs depois)
- [ ] Validar cache funcionando

**Validação de Performance:**
```sql
-- Antes da migração
EXPLAIN ANALYZE
SELECT ... -- query típica

-- Depois da migração
EXPLAIN ANALYZE
SELECT ... -- mesma query

-- Comparar tempos de execução
```

**Duração Estimada:** 10 horas

---

**CHECKPOINT FASE 4:**

✅ **Critérios de Aprovação:**
- [ ] 100% das APIs migradas
- [ ] Zero uso de `routePermissions` hardcoded
- [ ] Todos os testes automatizados passando
- [ ] Testes manuais de regressão completos
- [ ] Performance igual ou melhor que antes
- [ ] Logs de auditoria funcionando
- [ ] Documentação atualizada

**Testes de Regressão:**
```bash
# Suite completa de testes
npm run test:e2e

# Testes de carga
npm run test:load

# Testes de segurança
npm run test:security
```

**Duração Total da Fase 4:** 32 horas

---

### **FASE 5: ATUALIZAR FRONTEND**

#### **Objetivo:** Atualizar componentes frontend para usar slugs

**Checkpoint:** `checkpoint_fase5_frontend_atualizado`

#### **Passo 5.1: Atualizar `usePermissions` Hook**

**Arquivo:** `src/hooks/usePermissions.ts`

**Tarefas:**
- [ ] Modificar para usar `slug` em vez de nome
- [ ] Atualizar interface `UserPermissions` para usar slugs
- [ ] Adicionar mapeamento de compatibilidade temporário
- [ ] Testar com todos os componentes

```typescript
// ANTES:
interface UserPermissions {
  'Imóveis': 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  'Clientes': 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  // ...
}

// DEPOIS:
interface UserPermissions {
  'imoveis': 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  'clientes': 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  // ...
}
```

**Duração Estimada:** 3 horas

---

#### **Passo 5.2: Atualizar PermissionGuard**

**Arquivo:** `src/components/admin/PermissionGuard.tsx`

**Tarefas:**
- [ ] Modificar para aceitar `slug` como resource
- [ ] Manter compatibilidade com nome antigo (deprecado)
- [ ] Adicionar aviso de console para uso de nome
- [ ] Atualizar todos os usos

```typescript
// ANTES:
<PermissionGuard resource="Imóveis" action="WRITE">
  <Button>Criar Imóvel</Button>
</PermissionGuard>

// DEPOIS:
<PermissionGuard resource="imoveis" action="WRITE">
  <Button>Criar Imóvel</Button>
</PermissionGuard>
```

**Duração Estimada:** 2 horas

---

#### **Passo 5.3: Atualizar Todas as Páginas**

**Páginas a atualizar:**
- `src/app/admin/imoveis/**/*.tsx` (~15 arquivos)
- `src/app/admin/clientes/**/*.tsx` (~5 arquivos)
- `src/app/admin/proprietarios/**/*.tsx` (~5 arquivos)
- `src/app/admin/usuarios/**/*.tsx` (~5 arquivos)
- `src/app/admin/amenidades/**/*.tsx` (~5 arquivos)
- `src/app/admin/proximidades/**/*.tsx` (~5 arquivos)
- Demais páginas admin (~20 arquivos)

**Estratégia:**
1. Criar script de busca e substituição automática
2. Revisar cada substituição manualmente
3. Testar cada página após atualização

**Script:**
```bash
# find-replace-resources.sh
#!/bin/bash

# Mapeamento de recursos antigos para slugs
declare -A mapping=(
  ["Imóveis"]="imoveis"
  ["Clientes"]="clientes"
  ["Proprietários"]="proprietarios"
  ["Usuários"]="usuarios"
  # ... continuar para todos ...
)

for old in "${!mapping[@]}"; do
  new="${mapping[$old]}"
  echo "Substituindo '$old' por '$new'..."
  
  find src/app/admin -type f -name "*.tsx" -exec sed -i "s/resource=\"$old\"/resource=\"$new\"/g" {} +
  find src/app/admin -type f -name "*.tsx" -exec sed -i "s/resource='$old'/resource='$new'/g" {} +
done

echo "Substituição concluída!"
```

**Tarefas:**
- [ ] Executar script de substituição
- [ ] Revisar diff completo
- [ ] Corrigir substituições incorretas
- [ ] Testar cada página CRUD
- [ ] Validar botões com WriteGuard/DeleteGuard
- [ ] Testar com diferentes perfis

**Duração Estimada:** 8 horas

---

#### **Passo 5.4: Atualizar AdminSidebar**

**Arquivo:** `src/components/admin/AdminSidebar.tsx`

**Tarefas:**
- [ ] Usar `feature_id` em vez de `resource` string
- [ ] Buscar slug do banco via API
- [ ] Atualizar `useSidebarMenu` hook
- [ ] Testar renderização da sidebar
- [ ] Validar itens visíveis por perfil

**Duração Estimada:** 4 horas

---

**CHECKPOINT FASE 5:**

✅ **Critérios de Aprovação:**
- [ ] 100% dos componentes usando slugs
- [ ] Zero console warnings de recursos antigos
- [ ] Sidebar renderizando corretamente
- [ ] PermissionGuards funcionando 100%
- [ ] Botões aparecendo/ocultando conforme permissões
- [ ] Testes E2E passando

**Testes:**
```bash
# Testes E2E completos
npm run test:e2e

# Verificar uso de recursos antigos
grep -r 'resource="[A-Z]' src/app/admin/
# Deve retornar vazio

# Verificar slugs
grep -r 'resource="[a-z]' src/app/admin/
# Deve retornar todos os usos corretos
```

**Duração Total da Fase 5:** 17 horas

---

### **FASE 6: LIMPEZA E OTIMIZAÇÃO**

#### **Objetivo:** Remover código antigo e otimizar sistema

**Checkpoint:** `checkpoint_fase6_limpeza_completa`

#### **Passo 6.1: Remover Código Antigo**

**Tarefas:**
- [ ] Mover `permissionMiddleware.ts` para `src/lib/middleware/deprecated/`
- [ ] Mover `authMiddleware.ts` para `src/lib/middleware/deprecated/`
- [ ] Remover `mapFeatureToResource()` de `userPermissions.ts`
- [ ] Remover `userHasPermission()` duplicado de `users.ts`
- [ ] Limpar imports não utilizados
- [ ] Atualizar `.gitignore` para não commitar deprecated/

**Validação:**
```bash
# Verificar que nada importa arquivos antigos
grep -r "from.*deprecated" src/
# Deve retornar vazio

# Verificar imports quebrados
npm run build
# Deve compilar sem erros
```

**Duração Estimada:** 2 horas

---

#### **Passo 6.2: Otimizar Queries do Banco**

**Tarefas:**
- [ ] Analisar queries mais lentas
- [ ] Adicionar índices necessários
- [ ] Otimizar joins em `getUserPermissionsMap()`
- [ ] Implementar materialized views se necessário
- [ ] Configurar cache de permissões no Redis (opcional)

**Queries a Otimizar:**
```sql
-- Query 1: Buscar permissões do usuário
EXPLAIN ANALYZE
SELECT ...
FROM user_role_assignments ura
JOIN role_permissions rp ON ...
JOIN permissions p ON ...
JOIN system_features sf ON ...
WHERE ura.user_id = $1;

-- Adicionar índices compostos se necessário
CREATE INDEX idx_user_role_perm 
ON role_permissions(role_id, permission_id);

-- Query 2: Buscar configuração de rota
EXPLAIN ANALYZE
SELECT ...
FROM route_permissions_config rpc
JOIN system_features sf ON rpc.feature_id = sf.id
WHERE rpc.route_pattern = $1 AND rpc.method = $2;

-- Índice já criado, verificar uso
```

**Duração Estimada:** 4 horas

---

#### **Passo 6.3: Implementar Cache Inteligente**

**Arquivo:** `src/lib/permissions/PermissionCache.ts` (NOVO)

**Tarefas:**
- [ ] Implementar cache em memória com TTL
- [ ] Invalidar cache quando permissões mudam
- [ ] Implementar cache Redis (opcional)
- [ ] Monitorar hit rate do cache
- [ ] Adicionar métricas

```typescript
// PermissionCache.ts
class PermissionCache {
  private cache: Map<string, { data: any; expires: number }>
  private TTL = 5 * 60 * 1000 // 5 minutos
  
  get(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }
  
  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.TTL
    })
  }
  
  invalidate(pattern: string): void {
    // Invalidar keys que correspondem ao padrão
    for (const [key, _] of this.cache.entries()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

export const permissionCache = new PermissionCache()
```

**Integração:**
- [ ] Usar cache em `PermissionChecker.checkUserPermission()`
- [ ] Usar cache em `UnifiedPermissionMiddleware.getRouteConfig()`
- [ ] Invalidar cache ao alterar permissões
- [ ] Invalidar cache ao alterar perfis

**Duração Estimada:** 4 horas

---

**CHECKPOINT FASE 6:**

✅ **Critérios de Aprovação:**
- [ ] Código antigo movido para `deprecated/`
- [ ] Build funcionando 100%
- [ ] Performance melhorada vs baseline
- [ ] Cache funcionando com >80% hit rate
- [ ] Documentação atualizada

**Benchmarks:**
```bash
# Antes da otimização
ab -n 1000 -c 10 http://localhost:3000/api/admin/imoveis

# Depois da otimização
ab -n 1000 -c 10 http://localhost:3000/api/admin/imoveis

# Comparar:
# - Requests per second
# - Time per request
# - 95th percentile
```

**Duração Total da Fase 6:** 10 horas

---

### **FASE 7: TESTES FINAIS E DOCUMENTAÇÃO**

#### **Objetivo:** Garantir qualidade e documentar sistema

**Checkpoint:** `checkpoint_fase7_testes_completos`

#### **Passo 7.1: Testes de Regressão Completos**

**Suite de Testes:**

**A. Testes Unitários:**
- [ ] PermissionChecker (100% coverage)
- [ ] UnifiedPermissionMiddleware (100% coverage)
- [ ] PermissionCache (100% coverage)

**B. Testes de Integração:**
- [ ] Fluxo completo: login → acessar recurso → logout
- [ ] Criação de perfil → atribuição de permissões → validação
- [ ] Sidebar dinâmica por perfil
- [ ] 2FA em rotas críticas

**C. Testes E2E:**
- [ ] CRUD de imóveis como Super Admin
- [ ] CRUD de imóveis como Corretor (apenas READ)
- [ ] Gestão de usuários
- [ ] Gestão de perfis e permissões
- [ ] Sessões concorrentes

**D. Testes de Segurança:**
- [ ] Bypass de autenticação (deve falhar)
- [ ] Bypass de permissões (deve falhar)
- [ ] Bypass de 2FA (deve falhar)
- [ ] SQL injection em rotas dinâmicas (deve falhar)
- [ ] XSS em campos de texto (deve falhar)

**E. Testes de Performance:**
- [ ] Carga de 100 requisições/segundo
- [ ] Cache funcionando sob carga
- [ ] Sem memory leaks
- [ ] Queries otimizadas (<100ms)

**Duração Estimada:** 12 horas

---

#### **Passo 7.2: Documentação Completa**

**Documentos a Criar/Atualizar:**

**A. Documentação Técnica:**
- [ ] `docs/ARQUITETURA_PERMISSOES.md`
- [ ] `docs/FLUXO_AUTENTICACAO_AUTORIZACAO.md`
- [ ] `docs/GUIA_ADICIONAR_NOVA_FUNCIONALIDADE.md`
- [ ] `docs/TROUBLESHOOTING_PERMISSOES.md`

**B. Documentação de API:**
- [ ] Swagger/OpenAPI para todas as rotas
- [ ] Exemplos de uso
- [ ] Códigos de erro

**C. README Atualizado:**
- [ ] Seção de permissões
- [ ] Como configurar novo perfil
- [ ] Como adicionar nova funcionalidade
- [ ] Como testar permissões

**D. Diagrams:**
- [ ] Diagrama ER do banco atualizado
- [ ] Fluxograma de verificação de permissão
- [ ] Sequência: requisição → middleware → banco → resposta

**Duração Estimada:** 8 horas

---

#### **Passo 7.3: Treinamento da Equipe**

**Tarefas:**
- [ ] Apresentação do novo sistema
- [ ] Workshop hands-on
- [ ] Guia de troubleshooting
- [ ] Sessão de Q&A

**Duração Estimada:** 4 horas

---

**CHECKPOINT FASE 7:**

✅ **Critérios de Aprovação:**
- [ ] 100% dos testes passando
- [ ] Coverage >90%
- [ ] Documentação completa
- [ ] Equipe treinada
- [ ] Aprovação do usuário final

**Duração Total da Fase 7:** 24 horas

---

### **FASE 8: VALIDAÇÃO FINAL E ENTREGA**

#### **Objetivo:** Validação completa em ambiente de testes/homologação

**Checkpoint:** `checkpoint_fase8_validacao_completa`

⚠️ **NOTA:** Sistema em **ambiente de testes/homologação** - SEM deploy em produção nesta fase!

---

#### **Passo 8.1: Validação Completa do Sistema**

**Tarefas:**
- [ ] Validar 100% das funcionalidades migradas
- [ ] Verificar integridade de dados no banco
- [ ] Validar logs de auditoria
- [ ] Confirmar cache funcionando
- [ ] Verificar performance baseline

**Validação de Integridade:**
```sql
-- Verificar configurações de rotas
SELECT 
    COUNT(*) as total_rotas,
    COUNT(DISTINCT feature_id) as features_vinculadas,
    COUNT(*) FILTER (WHERE requires_2fa) as rotas_com_2fa
FROM route_permissions_config;

-- Verificar slugs únicos
SELECT COUNT(DISTINCT slug) = COUNT(*) as slugs_unicos
FROM system_features;

-- Verificar sidebar normalizada
SELECT 
    COUNT(*) as total_items,
    COUNT(feature_id) as items_com_feature,
    COUNT(DISTINCT sir.role_id) as roles_vinculadas
FROM sidebar_menu_items smi
LEFT JOIN sidebar_item_roles sir ON smi.id = sir.sidebar_item_id;
```

**Duração Estimada:** 2 horas

---

#### **Passo 8.2: Testes de Stress e Carga**

**Objetivo:** Validar que sistema suporta uso intenso

**Testes a Executar:**

**A. Teste de Carga Básico:**
```bash
# 100 requisições simultâneas em rota comum
ab -n 1000 -c 100 http://localhost:3000/api/admin/imoveis

# Validar:
# - Requests per second > 50
# - Time per request < 100ms (95th percentile)
# - Zero erros
```

**B. Teste de Carga em Verificação de Permissões:**
```bash
# 1000 requisições em rotas protegidas
ab -n 1000 -c 50 -H "Authorization: Bearer $TOKEN" \
   http://localhost:3000/api/admin/usuarios

# Validar:
# - Cache hit rate > 80%
# - Tempo de verificação < 10ms
```

**C. Teste de Concorrência:**
```bash
# Múltiplos usuários com diferentes perfis
# Validar que permissões não vazam entre sessões
npm run test:concurrency
```

**D. Teste de Memory Leaks:**
```bash
# Executar por 30 minutos e monitorar memória
npm run test:memory-leak
```

**Tarefas:**
- [ ] Executar todos os testes de carga
- [ ] Documentar resultados
- [ ] Comparar com baseline (antes da refatoração)
- [ ] Validar que não há degradação de performance
- [ ] Validar que não há memory leaks

**Duração Estimada:** 4 horas

---

#### **Passo 8.3: Testes de Segurança Exaustivos**

**Objetivo:** Garantir que sistema é seguro contra ataques

**Testes Obrigatórios:**

**A. Tentativas de Bypass de Autenticação:**
```bash
# Testar acesso sem token
curl http://localhost:3000/api/admin/usuarios
# Esperado: 401 Unauthorized

# Testar com token inválido
curl -H "Authorization: Bearer invalid_token" \
     http://localhost:3000/api/admin/usuarios
# Esperado: 401 Unauthorized

# Testar com token expirado
curl -H "Authorization: Bearer $EXPIRED_TOKEN" \
     http://localhost:3000/api/admin/usuarios
# Esperado: 401 Unauthorized
```

**B. Tentativas de Bypass de Permissões:**
```bash
# Usuário Corretor tentando acessar rota de Admin
curl -H "Authorization: Bearer $CORRETOR_TOKEN" \
     http://localhost:3000/api/admin/roles
# Esperado: 403 Forbidden

# Corretor tentando criar usuário
curl -X POST -H "Authorization: Bearer $CORRETOR_TOKEN" \
     -d '{"username":"hack"}' \
     http://localhost:3000/api/admin/usuarios/create
# Esperado: 403 Forbidden
```

**C. Tentativas de Bypass de 2FA:**
```bash
# Tentar acessar rota crítica sem 2FA verificado
curl -X PUT -H "Authorization: Bearer $TOKEN_SEM_2FA" \
     http://localhost:3000/api/admin/roles/1/permissions
# Esperado: 403 Forbidden + "Verificação 2FA necessária"
```

**D. SQL Injection:**
```bash
# Testar injeção em parâmetros dinâmicos
curl http://localhost:3000/api/admin/imoveis/1' OR '1'='1
# Esperado: 400 ou 404, NUNCA retornar dados

# Testar em query strings
curl "http://localhost:3000/api/admin/imoveis?search='; DROP TABLE users; --"
# Esperado: Busca vazia, NUNCA executar comando
```

**E. Escalação de Privilégios:**
```bash
# Corretor tentando alterar próprio perfil para Admin
curl -X PUT -H "Authorization: Bearer $CORRETOR_TOKEN" \
     -d '{"role_id": 1}' \
     http://localhost:3000/api/admin/usuarios/[corretor_id]/assign-role
# Esperado: 403 Forbidden
```

**F. Teste de Rate Limiting:**
```bash
# 20 tentativas de login em 1 minuto
for i in {1..20}; do
  curl -X POST -d '{"username":"test","password":"wrong"}' \
       http://localhost:3000/api/admin/auth/login
done
# Esperado: Após 5 tentativas, retornar 429 Too Many Requests
```

**Tarefas:**
- [ ] Executar TODOS os testes de segurança
- [ ] Documentar cada tentativa de bypass
- [ ] Validar que TODAS falharam como esperado
- [ ] Verificar logs de auditoria registraram tentativas
- [ ] Criar relatório de segurança

**Duração Estimada:** 6 horas

---

#### **Passo 8.4: Testes de Regressão Completos**

**Objetivo:** Garantir que NADA foi quebrado

**Cenários a Testar:**

**A. Fluxo Completo de Autenticação:**
1. Login com usuário Super Admin → ✅ Sucesso
2. Verificar token válido → ✅ Válido
3. Acessar dashboard → ✅ Permitido
4. Acessar gestão de usuários → ✅ Permitido
5. Acessar gestão de perfis → ✅ Permitido
6. Logout → ✅ Token invalidado

**B. Fluxo Completo de CRUD (cada perfil):**

**Super Admin:**
- [ ] Criar imóvel → ✅
- [ ] Editar imóvel → ✅
- [ ] Visualizar imóvel → ✅
- [ ] Excluir imóvel → ✅

**Corretor:**
- [ ] Criar imóvel → ❌ (se não tiver permissão WRITE)
- [ ] Editar imóvel → ❌ (se não tiver permissão WRITE)
- [ ] Visualizar imóvel → ✅ (se tiver permissão READ)
- [ ] Excluir imóvel → ❌ (nunca tem DELETE)

**C. Fluxo Completo de Gestão de Perfis:**
1. Super Admin cria novo perfil "Gerente" → ✅
2. Atribui permissões específicas ao perfil → ✅
3. Cria novo usuário → ✅
4. Atribui perfil "Gerente" ao usuário → ✅
5. Faz login com o novo usuário → ✅
6. Valida que vê apenas o que pode acessar → ✅

**D. Fluxo Completo da Sidebar:**
1. Login com Super Admin → Vê TODOS os itens ✅
2. Login com Admin → Vê itens de Admin ✅
3. Login com Corretor → Vê apenas itens de Corretor ✅
4. Validar que botões aparecem/ocultam conforme permissões ✅

**E. Fluxo Completo de 2FA:**
1. Habilitar 2FA para perfil Admin → ✅
2. Criar novo Admin → ✅
3. Login com Admin → Solicita 2FA ✅
4. Tentar acessar rota crítica sem 2FA → ❌ Negado
5. Verificar 2FA → ✅
6. Acessar rota crítica → ✅ Permitido

**Tarefas:**
- [ ] Executar TODOS os fluxos com TODOS os perfis
- [ ] Documentar qualquer comportamento inesperado
- [ ] Criar relatório de regressão
- [ ] Validar que 100% dos fluxos funcionam

**Duração Estimada:** 8 horas

---

#### **Passo 8.5: Relatório Final de Validação**

**Documento:** `RELATORIO_VALIDACAO_FINAL.md`

**Conteúdo Obrigatório:**

**1. Sumário Executivo**
- Status geral: ✅ APROVADO / ⚠️ APROVADO COM RESSALVAS / ❌ REPROVADO
- Funcionalidades testadas: X/X (100%)
- Testes executados: Y
- Bugs encontrados: Z
- Bugs críticos: 0 (obrigatório)

**2. Testes Executados**
```markdown
| Categoria | Testes | Passaram | Falharam | Taxa |
|-----------|--------|----------|----------|------|
| Unitários | 150 | 150 | 0 | 100% |
| Integração | 80 | 80 | 0 | 100% |
| E2E | 50 | 50 | 0 | 100% |
| Segurança | 30 | 30 | 0 | 100% |
| Performance | 20 | 20 | 0 | 100% |
| Regressão | 100 | 100 | 0 | 100% |
| **TOTAL** | **430** | **430** | **0** | **100%** |
```

**3. Cobertura de Código**
- Cobertura atual: X%
- Meta: ≥90%
- Status: ✅ ATINGIDA / ❌ NÃO ATINGIDA

**4. Performance**
```markdown
| Métrica | Antes | Depois | Variação |
|---------|-------|--------|----------|
| Requests/s | 120 | 150 | +25% ✅ |
| Tempo/req (p95) | 95ms | 85ms | -10% ✅ |
| Cache hit rate | 0% | 85% | +85% ✅ |
| Queries > 1s | 5 | 0 | -100% ✅ |
```

**5. Segurança**
- Tentativas de bypass testadas: X
- Todas bloqueadas: ✅ SIM / ❌ NÃO
- Vulnerabilidades encontradas: 0 (obrigatório)
- Auditoria funcionando: ✅ SIM / ❌ NÃO

**6. Bugs Encontrados**
```markdown
| ID | Severidade | Descrição | Status | Responsável |
|----|------------|-----------|--------|-------------|
| #1 | 🟡 Médio | [Descrição] | ✅ Corrigido | [Nome] |
| #2 | 🟢 Baixo | [Descrição] | ✅ Corrigido | [Nome] |
```

**7. Recomendações**
- Itens para futuro aprimoramento
- Otimizações sugeridas
- Funcionalidades adicionais

**8. Conclusão**
```markdown
O sistema foi **APROVADO** para uso em ambiente de homologação.

✅ Todas as funcionalidades testadas e funcionando
✅ Zero bugs críticos
✅ Performance melhorada vs baseline
✅ Segurança validada
✅ 100% conforme Guardian Rules

**Próximos passos:**
1. Apresentação para stakeholders
2. Período de homologação (X semanas)
3. Coleta de feedback dos usuários
4. Correções finais (se necessário)
5. Preparação para deploy em produção (futura fase)
```

**Tarefas:**
- [ ] Compilar todos os resultados
- [ ] Criar relatório completo
- [ ] Apresentar ao solicitante
- [ ] Obter aprovação formal

**Duração Estimada:** 4 horas

---

**CHECKPOINT FASE 8:**

✅ **Critérios de Aprovação Final:**
- [ ] 100% dos testes passando
- [ ] Zero bugs críticos
- [ ] Cobertura ≥90%
- [ ] Performance igual ou melhor que antes
- [ ] Segurança validada em todos os cenários
- [ ] Relatório final aprovado
- [ ] Sistema pronto para homologação

**Duração Total da Fase 8:** 24 horas

---

## 📊 CRONOGRAMA E CHECKPOINTS

### **RESUMO DAS FASES**

| Fase | Descrição | Duração | Status |
|------|-----------|---------|--------|
| **FASE 1** | Análise e Preparação | ✅ Concluída | ✅ |
| **FASE 2** | Projeto do Banco de Dados | 10 horas | ⏳ |
| **FASE 3** | Sistema Centralizado | 14 horas | ⏳ |
| **FASE 4** | Migração das APIs | 32 horas | ⏳ |
| **FASE 5** | Atualização do Frontend | 17 horas | ⏳ |
| **FASE 6** | Limpeza e Otimização | 10 horas | ⏳ |
| **FASE 7** | Testes e Documentação | 24 horas | ⏳ |
| **FASE 8** | Validação Final e Entrega | 24 horas | ⏳ |
| **TOTAL** | - | **131 horas** | - |

### **CRONOGRAMA SUGERIDO**

**Considerando 4 horas/dia de trabalho focado:**

- **Semana 1** (16h): FASE 2 (10h) + FASE 3 início (6h)
- **Semana 2** (16h): FASE 3 conclusão (8h) + FASE 4 início (8h)
- **Semana 3** (16h): FASE 4 continuação (16h)
- **Semana 4** (16h): FASE 4 conclusão (8h) + FASE 5 (8h)
- **Semana 5** (16h): FASE 5 conclusão (9h) + FASE 6 (7h)
- **Semana 6** (16h): FASE 6 conclusão (3h) + FASE 7 (13h)
- **Semana 7** (16h): FASE 7 conclusão (11h) + FASE 8 início (5h)
- **Semana 8** (16h): FASE 8 conclusão (19h) + Buffer/Ajustes
- **Homologação** (contínuo): Validação com usuários reais

**Duração Total:** ~8 semanas (desenvolvimento) + período de homologação

---

## 🔄 ESTRATÉGIA DE ROLLBACK

### **PONTOS DE ROLLBACK**

Cada checkpoint permite rollback independente:

#### **Rollback Fase 2: Banco de Dados**

```bash
# Restaurar estrutura do banco
psql -U postgres -d net_imobiliaria -f database/rollback/001_rollback_route_permissions_config.sql
psql -U postgres -d net_imobiliaria -f database/rollback/002_rollback_slug.sql
psql -U postgres -d net_imobiliaria -f database/rollback/003_rollback_sidebar_normalization.sql

# Restaurar backup completo se necessário
pg_restore -U postgres -d net_imobiliaria -c backup_antes_fase2.backup

# Validar
npm run test:db
```

**Impacto:** Nenhum (apenas estrutura do banco)

---

#### **Rollback Fase 3: Sistema Centralizado**

```bash
# Reverter código
git revert [commits da fase 3]

# Reativar arquivos antigos
mv src/lib/middleware/deprecated/permissionMiddleware.ts src/lib/middleware/
mv src/lib/middleware/deprecated/authMiddleware.ts src/middleware/

# Restaurar imports
git checkout HEAD~N -- [arquivos afetados]

# Rebuild
npm run build

# Validar
npm test
```

**Impacto:** Baixo (código ainda não usado em produção)

---

#### **Rollback Fase 4: APIs Migradas**

```bash
# Reverter commits das APIs
git revert [commits da fase 4]

# Rebuild e deploy
npm run build
npm run deploy

# Validar
npm run test:api
```

**Impacto:** Médio (APIs em uso, mas funcionam igual)

---

#### **Rollback Fase 8: Validação**

```bash
# Reverter última fase se validação falhar
git revert [commits da fase 8]

# Restaurar banco se necessário
pg_restore -U postgres -d net_imobiliaria -c backup_apos_fase7.backup

# Re-executar suite de testes
npm run test:all

# Analisar e corrigir problemas encontrados
```

**Impacto:** Baixo (ainda em testes/homologação)

---

### **BACKUPS OBRIGATÓRIOS**

| Checkpoint | Backup | Quando |
|------------|--------|--------|
| Início Fase 2 | `backup_antes_fase2.backup` | Antes de alterar banco |
| Fim Fase 2 | `backup_apos_fase2.backup` | Após validar estrutura |
| Fim Fase 3 | `backup_apos_fase3.backup` | Após código centralizado |
| Fim Fase 7 | `backup_apos_fase7.backup` | Após testes completos |
| Antes Fase 8 | `backup_antes_validacao.backup` | Antes de validação final |

---

## ✅ TESTES OBRIGATÓRIOS

### **FASE 2: Banco de Dados**

```sql
-- Validar estrutura
\d route_permissions_config
\d system_features
\d sidebar_menu_items
\d sidebar_item_roles

-- Validar dados
SELECT COUNT(*) FROM route_permissions_config;
SELECT COUNT(*) FROM system_features WHERE slug IS NULL;
SELECT COUNT(*) FROM sidebar_item_roles;

-- Validar integridade referencial
SELECT * FROM route_permissions_config WHERE feature_id NOT IN (SELECT id FROM system_features);
SELECT * FROM sidebar_menu_items WHERE feature_id NOT IN (SELECT id FROM system_features);
```

---

### **FASE 3: Sistema Centralizado**

```bash
# Testes unitários
npm test src/lib/permissions/PermissionChecker.test.ts
npm test src/lib/middleware/UnifiedPermissionMiddleware.test.ts

# Testes de integração
npm test src/integration/permission-flow.test.ts

# Coverage
npm test -- --coverage
# Mínimo 90%
```

---

### **FASE 4: APIs**

```bash
# Testes de API
npm run test:api

# Testes E2E
npm run test:e2e

# Comparação antes/depois
# Executar mesma suite nos dois sistemas
```

---

### **FASE 5: Frontend**

```bash
# Testes de componentes
npm test src/components

# Testes E2E de UI
npm run test:e2e:ui

# Validar guards
npm run test:guards
```

---

### **FASE 7: Completo**

```bash
# Suite completa
npm run test:all

# Segurança
npm run test:security

# Performance
npm run test:performance

# Carga
npm run test:load
```

---

## 📈 MÉTRICAS DE SUCESSO

### **OBJETIVOS QUANTIFICÁVEIS**

| Métrica | Meta | Como Medir |
|---------|------|------------|
| **Zero Hardcoding** | 100% | `grep -r "const routePermissions" src/` = vazio |
| **Centralização** | 1 middleware | Contar arquivos em `src/lib/middleware/` |
| **Performance** | ≤ atual + 10% | Benchmark antes/depois |
| **Cobertura de Testes** | ≥ 90% | `npm test -- --coverage` |
| **Documentação** | 100% | Checklist de docs completo |
| **Bugs em Produção** | 0 críticos | Monitoramento 48h |

---

## 🎯 BENEFÍCIOS ESPERADOS

### **TÉCNICOS**

✅ **Manutenibilidade:**
- Nova funcionalidade: 1 lugar (banco) vs 4 lugares (antes)
- Mudança de permissão: tempo real vs deploy
- Debug: logs centralizados

✅ **Performance:**
- Cache inteligente
- Queries otimizadas
- Menos código a executar

✅ **Escalabilidade:**
- Ilimitadas funcionalidades
- Ilimitadas rotas
- Sem limite de perfis

---

### **NEGÓCIO**

✅ **Agilidade:**
- Nova funcionalidade: minutos vs horas
- Configuração de perfis: self-service
- Ajustes de permissão: sem deploy

✅ **Segurança:**
- Auditoria completa
- Rastreabilidade total
- Consistência garantida

✅ **Confiabilidade:**
- Fonte única de verdade
- Menos bugs
- Testes automatizados

---

## 🛡️ CONFORMIDADE COM GUARDIAN RULES

### **CHECKLIST DE CONFORMIDADE**

#### **Regra Primordial: "INCREMENTAL SIM, DESTRUTIVO NUNCA!"**
- ✅ Refatoração 100% incremental
- ✅ Sistema antigo preservado durante migração
- ✅ Rollback garantido em cada fase
- ✅ Testes obrigatórios antes de prosseguir

#### **Protocolo de Impacto:**
- ✅ Análise de impacto completa (FASE 1)
- ✅ Documento detalhado criado
- ✅ Aprovação necessária antes de cada fase crítica
- ✅ Checkpoints obrigatórios

#### **Segurança:**
- ✅ Zero bypass de autenticação/autorização
- ✅ Todas as permissões verificadas no banco
- ✅ 2FA mantido onde obrigatório
- ✅ Auditoria completa (`granted_by`, `assigned_by`)
- ✅ Rate limiting preservado

#### **Banco de Dados:**
- ✅ Zero deleção de dados
- ✅ Apenas adição de tabelas/campos
- ✅ Foreign keys com ON DELETE apropriado
- ✅ Integridade referencial garantida
- ✅ Backups obrigatórios

#### **Testes:**
- ✅ Testes automatizados completos
- ✅ Testes de regressão
- ✅ Testes de segurança
- ✅ Testes de performance
- ✅ Testes E2E

#### **Auditoria:**
- ✅ Todos os `granted_by` preservados
- ✅ Todos os `assigned_by` preservados
- ✅ Logs de todas as operações
- ✅ Rastreabilidade total

---

## 📞 PRÓXIMOS PASSOS

### **AGUARDANDO APROVAÇÃO DO USUÁRIO**

**Antes de iniciar FASE 2, necessário:**

1. ✅ **Revisão completa deste documento**
2. ✅ **Aprovação do plano de execução**
3. ✅ **Confirmação do cronograma**
4. ✅ **Alinhamento de expectativas**
5. ✅ **Autorização para prosseguir**

---

### **PERGUNTAS PARA O USUÁRIO**

1. **Cronograma:** 8 semanas está adequado para desenvolvimento + testes exaustivos?
2. **Prioridades:** Alguma funcionalidade deve ser migrada primeiro?
3. **Testes:** Haverá usuários disponíveis para testes de homologação?
4. **Homologação:** Quanto tempo de período de homologação está planejado?
5. **Feedback:** Como será coletado o feedback dos usuários durante homologação?

---

## 📝 CONCLUSÃO

Este plano de refatoração foi elaborado seguindo rigorosamente as **GUARDIAN RULES** 🛡️:

✅ **INCREMENTAL SIM, DESTRUTIVO NUNCA!**
✅ **Análise de impacto minuciosa**
✅ **Rollback garantido**
✅ **Testes obrigatórios**
✅ **Segurança preservada**
✅ **Auditoria completa**

**O sistema resultante será:**
- 🚫 Zero hardcoding
- 🔄 100% dinâmico
- 📊 Regido pelo banco de dados
- 🔧 Altamente manutenível
- ⚡ Performático
- 🛡️ Seguro

**Aguardando sua aprovação para iniciar FASE 2!** 🚀

---

**Versão:** 1.0  
**Data:** 29/10/2025  
**Status:** 📋 **AGUARDANDO APROVAÇÃO**

