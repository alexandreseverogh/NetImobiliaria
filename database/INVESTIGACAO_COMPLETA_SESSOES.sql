-- ============================================================
-- INVESTIGAÇÃO COMPLETA DO PROBLEMA DE SESSÕES
-- ============================================================
-- Objetivo: Verificar por que Sessões não aparece na sidebar mesmo com URL correta
-- ============================================================

-- 1. Verificar estado atual da funcionalidade Sessões
SELECT 
    id,
    name,
    url,
    "Crud_Execute",
    is_active,
    category_id,
    created_at,
    updated_at
FROM system_features 
WHERE name = 'Sessões';

-- 2. Verificar se há permissões para Sessões
SELECT 
    p.id,
    p.action,
    p.description,
    sf.name as feature_name,
    sf.url
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.name = 'Sessões'
ORDER BY p.action;

-- 3. Verificar se admin tem permissão para Sessões
SELECT 
    u.username,
    sf.name as feature_name,
    p.action,
    p.description
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin' 
  AND sf.name = 'Sessões';

-- 4. Verificar se Sessões está na sidebar_menu_items
SELECT 
    smi.id,
    smi.name,
    smi.url,
    smi.parent_id,
    smi.order_index,
    smi.is_active,
    sf.name as feature_name,
    sf.url as feature_url
FROM sidebar_menu_items smi
JOIN system_features sf ON smi.feature_id = sf.id
WHERE sf.name = 'Sessões';

-- 5. Verificar se há item na sidebar sem feature_id (possível problema)
SELECT 
    smi.id,
    smi.name,
    smi.url,
    smi.parent_id,
    smi.order_index,
    smi.is_active,
    smi.feature_id
FROM sidebar_menu_items smi
WHERE smi.name ILIKE '%sess%' 
   OR smi.url ILIKE '%sess%';
