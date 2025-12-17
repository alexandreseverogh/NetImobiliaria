# 🛠️ PLANO DE IMPLEMENTAÇÃO - CORREÇÕES DE PERMISSÕES

**Data**: 09/10/2025  
**Status**: 🚀 **PRONTO PARA EXECUÇÃO**  
**Prioridade**: 🔴 **ALTA**

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **FASE 1: CORREÇÕES NO BANCO DE DADOS (pgAdmin4)**

#### ✅ **1.1 - Verificar Estrutura Atual**
```sql
-- Executar no pgAdmin4 para verificar tabelas existentes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('permissions', 'user_permissions', 'system_features', 'user_roles', 'role_permissions', 'user_role_assignments')
ORDER BY table_name;
```

#### ✅ **1.2 - Verificar Permissões do Admin**
```sql
-- Verificar se admin tem todas as permissões
SELECT 
    ur.name as perfil,
    COUNT(rp.permission_id) as total_permissoes,
    COUNT(p.id) as total_permissoes_disponiveis
FROM user_roles ur
LEFT JOIN role_permissions rp ON ur.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE ur.name IN ('Administrador', 'Super Admin')
GROUP BY ur.id, ur.name
ORDER BY ur.name;
```

#### ✅ **1.3 - Remover Tabela Órfã `user_permissions`**
```sql
-- ⚠️ ATENÇÃO: Esta operação é IRREVERSÍVEL!
-- Verificar se a tabela está vazia antes de remover
SELECT COUNT(*) as total_registros FROM user_permissions;

-- Se estiver vazia (0 registros), pode remover com segurança
DROP TABLE IF EXISTS user_permissions CASCADE;
```

#### ✅ **1.4 - Garantir Permissões Completas para Admin/Super Admin**
```sql
-- Garantir que Admin e Super Admin tenham TODAS as permissões
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    ur.id as role_id,
    p.id as permission_id
FROM user_roles ur
CROSS JOIN permissions p
WHERE ur.name IN ('Administrador', 'Super Admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
```

#### ✅ **1.5 - Verificar Funcionalidades Disponíveis**
```sql
-- Ver todas as funcionalidades cadastradas
SELECT 
    sf.id,
    sf.name,
    sf.category,
    sf.url,
    sf.is_active,
    COUNT(p.id) as total_permissoes
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
GROUP BY sf.id, sf.name, sf.category, sf.url, sf.is_active
ORDER BY sf.category, sf.name;
```

---

### **FASE 2: CORREÇÕES NO CÓDIGO (Frontend)**

#### ✅ **2.1 - Reativar Filtro na Sidebar**
**Arquivo**: `src/components/admin/AdminSidebar.tsx`

**Localizar** (linha ~272):
```typescript
// TEMPORARIAMENTE: Mostrar TODOS os itens sem filtro
const getFilteredMenu = () => {
  const allItems = getMenuStructure()
  
  console.log('🔍 AdminSidebar - Usuário:', user.username, 'Role:', user.role_name)
  console.log('🔍 AdminSidebar - Permissões:', user.permissoes)
  console.log('🔍 AdminSidebar - Total de itens:', allItems.length)
  console.log('🔍 AdminSidebar - Itens completos:', JSON.stringify(allItems, null, 2))
  
  // TEMPORARIAMENTE: Retornar todos os itens sem nenhum filtro
  return allItems
}
```

**Substituir por**:
```typescript
const getFilteredMenu = () => {
  const allItems = getMenuStructure()
  
  console.log('🔍 AdminSidebar - Usuário:', user.username, 'Role:', user.role_name)
  console.log('🔍 AdminSidebar - Permissões:', user.permissoes)
  
  // Filtrar itens baseado nas permissões do usuário
  return allItems.filter(item => {
    // Admin e Super Admin sempre têm acesso a tudo
    if (['Administrador', 'Super Admin'].includes(user.role_name)) {
      return true
    }
    
    // Outros perfis: verificar se têm permissão para o recurso
    if (item.resource && user.permissoes) {
      return user.permissoes[item.resource] !== undefined
    }
    
    return false
  })
}
```

---

### **FASE 3: TESTES E VALIDAÇÃO**

#### ✅ **3.1 - Teste de Login Admin**
1. Fazer login como admin
2. Verificar se TODAS as opções aparecem na sidebar
3. Testar acesso a funcionalidades que não apareciam antes

#### ✅ **3.2 - Teste de Login Corretor**
1. Fazer login como corretor
2. Verificar se apenas funcionalidades permitidas aparecem
3. Confirmar que botões de ação estão ocultos quando sem permissão

#### ✅ **3.3 - Teste de Nova Funcionalidade**
1. Adicionar nova funcionalidade no banco
2. Verificar se admin tem acesso automático
3. Confirmar que outros perfis não têm acesso

---

## 🎯 EXECUÇÃO MANUAL NO PGADMIN4

### **PASSO A PASSO DETALHADO**

#### **1. Abrir pgAdmin4**
- Conectar ao servidor PostgreSQL
- Selecionar banco `net_imobiliaria`
- Abrir Query Tool (ícone SQL)

#### **2. Executar Verificações (Copiar e colar cada query)**

**Query 1 - Verificar Tabelas**:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('permissions', 'user_permissions', 'system_features', 'user_roles', 'role_permissions', 'user_role_assignments')
ORDER BY table_name;
```

**Query 2 - Verificar Permissões do Admin**:
```sql
SELECT 
    ur.name as perfil,
    COUNT(rp.permission_id) as total_permissoes,
    COUNT(p.id) as total_permissoes_disponiveis
FROM user_roles ur
LEFT JOIN role_permissions rp ON ur.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE ur.name IN ('Administrador', 'Super Admin')
GROUP BY ur.id, ur.name
ORDER BY ur.name;
```

**Query 3 - Verificar Tabela user_permissions**:
```sql
SELECT COUNT(*) as total_registros FROM user_permissions;
```

#### **3. Executar Correções (Uma por vez)**

**Correção 1 - Remover Tabela Órfã**:
```sql
DROP TABLE IF EXISTS user_permissions CASCADE;
```

**Correção 2 - Garantir Permissões do Admin**:
```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    ur.id as role_id,
    p.id as permission_id
FROM user_roles ur
CROSS JOIN permissions p
WHERE ur.name IN ('Administrador', 'Super Admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
```

#### **4. Verificar Resultados**

**Query Final - Confirmar Correções**:
```sql
SELECT 
    ur.name as perfil,
    COUNT(rp.permission_id) as total_permissoes
FROM user_roles ur
LEFT JOIN role_permissions rp ON ur.id = rp.role_id
WHERE ur.name IN ('Administrador', 'Super Admin')
GROUP BY ur.id, ur.name
ORDER BY ur.name;
```

---

## ⚠️ PRECAUÇÕES E BACKUP

### **ANTES DE EXECUTAR**:
1. **Fazer backup do banco**:
   ```sql
   -- No pgAdmin4, clicar com botão direito no banco
   -- Selecionar "Backup..." 
   -- Salvar arquivo .backup
   ```

2. **Verificar se tabela user_permissions está vazia**:
   ```sql
   SELECT COUNT(*) FROM user_permissions;
   -- Se retornar 0, pode remover com segurança
   ```

### **APÓS EXECUTAR**:
1. **Testar login admin** - deve ter acesso a todas funcionalidades
2. **Testar login corretor** - deve ter acesso apenas às permitidas
3. **Verificar sidebar** - deve filtrar corretamente

---

## 🚀 ORDEM DE EXECUÇÃO RECOMENDADA

### **1. PRIMEIRO: Banco de Dados (pgAdmin4)**
- ✅ Verificar estrutura atual
- ✅ Fazer backup
- ✅ Remover tabela órfã
- ✅ Garantir permissões do admin
- ✅ Verificar resultados

### **2. SEGUNDO: Código (VS Code)**
- ✅ Corrigir filtro da sidebar
- ✅ Testar localmente
- ✅ Commit das alterações

### **3. TERCEIRO: Testes Completos**
- ✅ Login admin - acesso total
- ✅ Login corretor - acesso limitado
- ✅ Nova funcionalidade - admin automático

---

## 📊 RESULTADOS ESPERADOS

### **Após Correções**:
- ✅ Admin vê TODAS as funcionalidades na sidebar
- ✅ Corretor vê apenas as permitidas
- ✅ Tabela órfã removida (sem confusão)
- ✅ Sistema funcionando perfeitamente
- ✅ Modelo claro e consistente

### **Indicadores de Sucesso**:
- Admin consegue acessar todas as opções
- Sidebar filtra corretamente por perfil
- Não há erros no console do navegador
- Sistema mais rápido (sem tabelas órfãs)

---

**Autor**: Assistente AI  
**Data**: 09/10/2025  
**Status**: 🚀 **PRONTO PARA EXECUÇÃO**
