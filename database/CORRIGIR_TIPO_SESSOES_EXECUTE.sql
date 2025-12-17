-- ============================================================
-- CORREÇÃO DO TIPO DA FUNCIONALIDADE SESSÕES
-- ============================================================
-- Objetivo: Corrigir o campo Crud_Execute de CRUD para EXECUTE
-- ============================================================

-- 1. Verificar estado atual da funcionalidade Sessões
SELECT 
    id,
    name,
    url,
    "Crud_Execute",
    is_active,
    category_id
FROM system_features 
WHERE name = 'Sessões';

-- 2. Corrigir o tipo de CRUD para EXECUTE
UPDATE system_features 
SET "Crud_Execute" = 'EXECUTE',
    updated_at = NOW()
WHERE name = 'Sessões';

-- 3. Verificar se a correção foi aplicada
SELECT 
    id,
    name,
    url,
    "Crud_Execute",
    is_active,
    category_id,
    updated_at
FROM system_features 
WHERE name = 'Sessões';

-- 4. Verificar as permissões atuais para Sessões
SELECT 
    p.id,
    p.action,
    p.description,
    sf.name as feature_name,
    sf."Crud_Execute"
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.name = 'Sessões'
ORDER BY p.action;
