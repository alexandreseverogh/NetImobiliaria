-- ============================================================
-- INVESTIGAÇÃO DE FUNCIONALIDADES DE SESSÕES
-- ============================================================
-- Objetivo: Verificar se existe funcionalidade de sessões no sistema
-- ============================================================

-- 1. Verificar funcionalidades relacionadas a sessões
SELECT 
    id, 
    name, 
    url, 
    "Crud_Execute", 
    is_active,
    category_id
FROM system_features 
WHERE name ILIKE '%sess%' 
   OR url ILIKE '%sess%'
   OR name ILIKE '%session%'
   OR url ILIKE '%session%'
ORDER BY name;

-- 2. Verificar todas as funcionalidades para encontrar sessões
SELECT 
    id, 
    name, 
    url, 
    "Crud_Execute", 
    is_active
FROM system_features 
WHERE name ILIKE '%Sess%'
ORDER BY name;

-- 3. Verificar se há permissões para sessões
SELECT 
    p.id,
    p.action,
    p.description,
    sf.name as feature_name,
    sf.url
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.name ILIKE '%sess%' 
   OR sf.url ILIKE '%sess%'
   OR p.description ILIKE '%sess%'
ORDER BY sf.name, p.action;
