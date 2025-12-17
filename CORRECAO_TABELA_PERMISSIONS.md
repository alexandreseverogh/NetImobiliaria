# 🚨 CORREÇÃO CRÍTICA: TABELA PERMISSIONS

**Data**: 09/10/2025  
**Status**: 🔴 **PROBLEMA CRÍTICO IDENTIFICADO**  
**Severidade**: 🔴 **ALTA**

---

## 🚨 PROBLEMA IDENTIFICADO

### **Duplicação e Inconsistência na Tabela `permissions`**

**Exemplo do problema**:
```sql
-- Registro 1 (CORRETO)
id: 387, feature_id: 1, action: 'READ' (maiúsculo), description: 'Visualizar Categorias de Funcionalidades'

-- Registro 2 (DUPLICADO/INCORRETO)  
id: 467, feature_id: 1, action: 'read' (minúsculo), description: 'null'
```

**PROBLEMAS IDENTIFICADOS**:
1. ✅ **Duplicação**: Dois registros para mesma funcionalidade (feature_id: 1)
2. ✅ **Inconsistência**: Ações em maiúsculo vs minúsculo
3. ✅ **Dados órfãos**: Descrições nulas ou inconsistentes
4. ✅ **Violação de UNIQUE**: Constraint `UNIQUE(feature_id, action)` não está funcionando

---

## 🔍 ANÁLISE DO CAMPO `description`

### **Propósito do Campo `description`**:
- ✅ **Documentação**: Explicar o que a permissão permite fazer
- ✅ **Auditoria**: Facilitar identificação em logs
- ✅ **Interface**: Possível uso em tooltips ou ajuda
- ✅ **Manutenção**: Facilitar identificação para desenvolvedores

### **Exemplos de Descrições Corretas**:
```sql
-- Para feature_id: 1 (Categorias de Funcionalidades)
action: 'READ'    → description: 'Visualizar Categorias de Funcionalidades'
action: 'CREATE'  → description: 'Criar Nova Categoria de Funcionalidade'
action: 'UPDATE'  → description: 'Editar Categoria de Funcionalidade'
action: 'DELETE'  → description: 'Excluir Categoria de Funcionalidade'
```

---

## 🛠️ PLANO DE CORREÇÃO COMPLETA

### **FASE 1: ANÁLISE E DIAGNÓSTICO**

#### **Query 1 - Identificar Duplicações**
```sql
SELECT 
    feature_id,
    action,
    COUNT(*) as total_duplicatas,
    STRING_AGG(id::text, ', ') as ids_duplicados,
    STRING_AGG(description, ' | ') as descriptions
FROM permissions
GROUP BY feature_id, action
HAVING COUNT(*) > 1
ORDER BY feature_id, action;
```

#### **Query 2 - Identificar Inconsistências de Case**
```sql
SELECT 
    feature_id,
    LOWER(action) as action_lower,
    COUNT(*) as total_variacoes,
    STRING_AGG(DISTINCT action, ', ') as variacoes_case,
    STRING_AGG(id::text, ', ') as ids_envolvidos
FROM permissions
GROUP BY feature_id, LOWER(action)
HAVING COUNT(DISTINCT action) > 1
ORDER BY feature_id, action_lower;
```

#### **Query 3 - Identificar Descrições Nulas**
```sql
SELECT 
    id,
    feature_id,
    action,
    description,
    CASE 
        WHEN description IS NULL THEN 'NULL'
        WHEN description = 'null' THEN 'STRING NULL'
        WHEN description = '' THEN 'VAZIO'
        ELSE 'OK'
    END as status_description
FROM permissions
WHERE description IS NULL 
   OR description = 'null' 
   OR description = ''
ORDER BY feature_id, action;
```

#### **Query 4 - Verificar Funcionalidades**
```sql
SELECT 
    sf.id,
    sf.name as funcionalidade,
    sf.category,
    COUNT(p.id) as total_permissoes,
    STRING_AGG(p.action, ', ') as acoes_disponiveis
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
GROUP BY sf.id, sf.name, sf.category
ORDER BY sf.category, sf.name;
```

---

### **FASE 2: CORREÇÃO AUTOMÁTICA**

#### **Passo 1 - Backup da Tabela**
```sql
-- Criar tabela de backup
CREATE TABLE permissions_backup AS 
SELECT * FROM permissions;

-- Verificar backup
SELECT COUNT(*) as total_backup FROM permissions_backup;
```

#### **Passo 2 - Remover Duplicatas (Manter o Melhor)**
```sql
-- Remover duplicatas, mantendo o registro com melhor description
WITH duplicates AS (
    SELECT 
        id,
        feature_id,
        action,
        description,
        ROW_NUMBER() OVER (
            PARTITION BY feature_id, LOWER(action) 
            ORDER BY 
                CASE WHEN description IS NOT NULL AND description != 'null' AND description != '' THEN 1 ELSE 2 END,
                id
        ) as rn
    FROM permissions
)
DELETE FROM permissions 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);
```

#### **Passo 3 - Padronizar Case das Ações**
```sql
-- Padronizar todas as ações para maiúsculo
UPDATE permissions 
SET action = UPPER(action)
WHERE action != UPPER(action);
```

#### **Passo 4 - Corrigir Descrições Nulas**
```sql
-- Corrigir descrições baseado na funcionalidade e ação
UPDATE permissions 
SET description = CASE 
    WHEN action = 'READ' THEN CONCAT('Visualizar ', sf.name)
    WHEN action = 'CREATE' THEN CONCAT('Criar ', sf.name)
    WHEN action = 'UPDATE' THEN CONCAT('Editar ', sf.name)
    WHEN action = 'DELETE' THEN CONCAT('Excluir ', sf.name)
    ELSE CONCAT(action, ' em ', sf.name)
END
FROM system_features sf
WHERE permissions.feature_id = sf.id
  AND (permissions.description IS NULL 
       OR permissions.description = 'null' 
       OR permissions.description = '');
```

#### **Passo 5 - Verificar Constraint UNIQUE**
```sql
-- Verificar se constraint está funcionando
ALTER TABLE permissions 
DROP CONSTRAINT IF EXISTS permissions_feature_id_action_key;

ALTER TABLE permissions 
ADD CONSTRAINT permissions_feature_id_action_key 
UNIQUE (feature_id, action);
```

---

### **FASE 3: VALIDAÇÃO E TESTES**

#### **Query de Validação Final**
```sql
-- Verificar se não há mais duplicatas
SELECT 
    feature_id,
    action,
    COUNT(*) as total
FROM permissions
GROUP BY feature_id, action
HAVING COUNT(*) > 1;

-- Deve retornar 0 registros
```

#### **Query de Verificação de Integridade**
```sql
-- Verificar integridade com system_features
SELECT 
    sf.name as funcionalidade,
    COUNT(p.id) as total_permissoes,
    STRING_AGG(p.action, ', ') as acoes,
    STRING_AGG(p.description, ' | ') as descriptions
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf.is_active = true
GROUP BY sf.id, sf.name
ORDER BY sf.name;
```

---

## 📋 SCRIPT COMPLETO DE CORREÇÃO

### **Execute no pgAdmin4 (Uma query por vez):**

```sql
-- 1. BACKUP
CREATE TABLE permissions_backup AS SELECT * FROM permissions;
SELECT 'Backup criado com ' || COUNT(*) || ' registros' FROM permissions_backup;

-- 2. IDENTIFICAR PROBLEMAS
SELECT 'Duplicatas encontradas:' as info;
SELECT feature_id, action, COUNT(*) as total 
FROM permissions 
GROUP BY feature_id, action 
HAVING COUNT(*) > 1;

-- 3. REMOVER DUPLICATAS
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY feature_id, LOWER(action) 
               ORDER BY 
                   CASE WHEN description IS NOT NULL AND description != 'null' AND description != '' THEN 1 ELSE 2 END,
                   id
           ) as rn
    FROM permissions
)
DELETE FROM permissions 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

SELECT 'Duplicatas removidas' as info;

-- 4. PADRONIZAR CASE
UPDATE permissions SET action = UPPER(action) WHERE action != UPPER(action);
SELECT 'Case padronizado' as info;

-- 5. CORRIGIR DESCRIÇÕES
UPDATE permissions 
SET description = CASE 
    WHEN action = 'READ' THEN CONCAT('Visualizar ', sf.name)
    WHEN action = 'CREATE' THEN CONCAT('Criar ', sf.name)
    WHEN action = 'UPDATE' THEN CONCAT('Editar ', sf.name)
    WHEN action = 'DELETE' THEN CONCAT('Excluir ', sf.name)
    ELSE CONCAT(action, ' em ', sf.name)
END
FROM system_features sf
WHERE permissions.feature_id = sf.id
  AND (permissions.description IS NULL 
       OR permissions.description = 'null' 
       OR permissions.description = '');

SELECT 'Descrições corrigidas' as info;

-- 6. VERIFICAR RESULTADO
SELECT 'Verificação final:' as info;
SELECT feature_id, action, COUNT(*) as total 
FROM permissions 
GROUP BY feature_id, action 
HAVING COUNT(*) > 1;
-- Deve retornar 0 registros
```

---

## 🎯 RESULTADO ESPERADO

### **Após Correção**:
- ✅ **Sem duplicatas**: Apenas 1 registro por (feature_id, action)
- ✅ **Case consistente**: Todas as ações em maiúsculo (READ, CREATE, UPDATE, DELETE)
- ✅ **Descrições completas**: Todas as permissões com descrição adequada
- ✅ **Integridade**: Constraint UNIQUE funcionando
- ✅ **Performance**: Tabela otimizada

### **Exemplo de Registros Corretos**:
```sql
-- Para feature_id: 1 (Categorias de Funcionalidades)
id: 387, feature_id: 1, action: 'READ',    description: 'Visualizar Categorias de Funcionalidades'
id: 388, feature_id: 1, action: 'CREATE',  description: 'Criar Categorias de Funcionalidades'
id: 389, feature_id: 1, action: 'UPDATE',  description: 'Editar Categorias de Funcionalidades'
id: 390, feature_id: 1, action: 'DELETE',  description: 'Excluir Categorias de Funcionalidades'
```

---

## ⚠️ PRECAUÇÕES

1. **Sempre fazer backup** antes de executar
2. **Executar queries uma por vez** e verificar resultados
3. **Testar após correção** para garantir funcionamento
4. **Verificar se não quebrou** nenhuma funcionalidade

---

**Autor**: Assistente AI  
**Data**: 09/10/2025  
**Status**: 🚨 **AGUARDANDO EXECUÇÃO DAS CORREÇÕES**
