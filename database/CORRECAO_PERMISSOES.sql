-- ============================================================
-- SCRIPT DE CORREÇÃO DAS PERMISSÕES
-- ============================================================
-- ATENÇÃO: Execute este script em ambiente de teste primeiro!
-- ============================================================

-- ============================================================
-- 1. BACKUP DAS PERMISSÕES ATUAIS
-- ============================================================
CREATE TABLE IF NOT EXISTS permissions_backup_$(date +%Y%m%d) AS 
SELECT * FROM permissions;

-- ============================================================
-- 2. REMOVER PERMISSÕES INCORRETAS DE FUNCIONALIDADES EXECUTE
-- ============================================================
-- Remove todas as permissões exceto EXECUTE e ADMIN de funcionalidades EXECUTE
DELETE FROM permissions 
WHERE id IN (
    SELECT p.id
    FROM permissions p
    JOIN system_features sf ON p.feature_id = sf.id
    WHERE sf."Crud_Execute" = 'EXECUTE'
    AND p.action NOT IN ('EXECUTE', 'ADMIN')
);

-- ============================================================
-- 3. REMOVER PERMISSÕES DUPLICADAS
-- ============================================================
-- Remove permissões duplicadas mantendo apenas a primeira
DELETE FROM permissions 
WHERE id IN (
    SELECT p1.id
    FROM permissions p1
    JOIN permissions p2 ON p1.feature_id = p2.feature_id 
        AND p1.action = p2.action 
        AND p1.id > p2.id
);

-- ============================================================
-- 4. CORRIGIR FUNCIONALIDADES EXECUTE SEM PERMISSÕES
-- ============================================================
-- Adiciona permissão EXECUTE para funcionalidades EXECUTE que não têm nenhuma permissão
INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
SELECT 
    sf.id,
    'EXECUTE',
    'Executar ' || sf.name,
    NOW(),
    NOW()
FROM system_features sf
WHERE sf."Crud_Execute" = 'EXECUTE'
AND NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.feature_id = sf.id
);

-- ============================================================
-- 5. CORRIGIR FUNCIONALIDADES CRUD SEM PERMISSÕES COMPLETAS
-- ============================================================

-- Adicionar CREATE se não existir
INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
SELECT 
    sf.id,
    'CREATE',
    'Criar ' || sf.name,
    NOW(),
    NOW()
FROM system_features sf
WHERE sf."Crud_Execute" = 'CRUD'
AND NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.feature_id = sf.id AND p.action = 'CREATE'
);

-- Adicionar READ se não existir
INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
SELECT 
    sf.id,
    'READ',
    'Visualizar ' || sf.name,
    NOW(),
    NOW()
FROM system_features sf
WHERE sf."Crud_Execute" = 'CRUD'
AND NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.feature_id = sf.id AND p.action = 'READ'
);

-- Adicionar UPDATE se não existir
INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
SELECT 
    sf.id,
    'UPDATE',
    'Editar ' || sf.name,
    NOW(),
    NOW()
FROM system_features sf
WHERE sf."Crud_Execute" = 'CRUD'
AND NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.feature_id = sf.id AND p.action = 'UPDATE'
);

-- Adicionar DELETE se não existir
INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
SELECT 
    sf.id,
    'DELETE',
    'Excluir ' || sf.name,
    NOW(),
    NOW()
FROM system_features sf
WHERE sf."Crud_Execute" = 'CRUD'
AND NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.feature_id = sf.id AND p.action = 'DELETE'
);

-- ============================================================
-- 6. REMOVER PERMISSÕES EXCESSIVAS DE FUNCIONALIDADES CRUD
-- ============================================================
-- Remove permissões que não são CREATE, READ, UPDATE, DELETE de funcionalidades CRUD
-- (exceto ADMIN que pode ser mantida para funcionalidades administrativas)
DELETE FROM permissions 
WHERE id IN (
    SELECT p.id
    FROM permissions p
    JOIN system_features sf ON p.feature_id = sf.id
    WHERE sf."Crud_Execute" = 'CRUD'
    AND p.action NOT IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'ADMIN')
);

-- ============================================================
-- 7. CORRIGIR FUNCIONALIDADES SEM TIPO DEFINIDO
-- ============================================================
-- Define tipo padrão baseado nas permissões existentes
UPDATE system_features 
SET "Crud_Execute" = CASE 
    WHEN EXISTS (
        SELECT 1 FROM permissions p 
        WHERE p.feature_id = system_features.id 
        AND p.action IN ('CREATE', 'READ', 'UPDATE', 'DELETE')
    ) THEN 'CRUD'
    ELSE 'EXECUTE'
END
WHERE "Crud_Execute" IS NULL;

-- ============================================================
-- 8. VALIDAÇÃO FINAL
-- ============================================================
-- Verificar se todas as funcionalidades estão consistentes
SELECT 
    'Funcionalidades EXECUTE com problemas' as problema,
    COUNT(*) as quantidade
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf."Crud_Execute" = 'EXECUTE'
GROUP BY sf.id
HAVING COUNT(p.id) != 1

UNION ALL

SELECT 
    'Funcionalidades CRUD com problemas' as problema,
    COUNT(*) as quantidade
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf."Crud_Execute" = 'CRUD'
GROUP BY sf.id
HAVING COUNT(p.id) != 4

UNION ALL

SELECT 
    'Funcionalidades sem tipo' as problema,
    COUNT(*) as quantidade
FROM system_features
WHERE "Crud_Execute" IS NULL;

-- ============================================================
-- 9. RELATÓRIO FINAL
-- ============================================================
SELECT 
    sf."Crud_Execute" as tipo,
    COUNT(*) as total_funcionalidades,
    AVG(perm_count.total) as media_permissoes_por_funcionalidade
FROM system_features sf
LEFT JOIN (
    SELECT feature_id, COUNT(*) as total
    FROM permissions
    GROUP BY feature_id
) perm_count ON sf.id = perm_count.feature_id
GROUP BY sf."Crud_Execute"
ORDER BY sf."Crud_Execute";
