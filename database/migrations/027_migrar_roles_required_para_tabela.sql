-- ================================================================
-- MIGRATION 027: MIGRAR roles_required PARA sidebar_item_roles
-- ================================================================
-- Transferir dados do campo JSONB para a tabela normalizada M:N
-- ================================================================

BEGIN;

-- 1. MIGRAR dados de roles_required para sidebar_item_roles
INSERT INTO sidebar_item_roles (sidebar_item_id, role_id)
SELECT DISTINCT
    smi.id as sidebar_item_id,
    ur.id as role_id
FROM sidebar_menu_items smi
CROSS JOIN LATERAL jsonb_array_elements_text(smi.roles_required) AS role_name
JOIN user_roles ur ON ur.name = role_name::text
WHERE smi.roles_required IS NOT NULL 
  AND jsonb_typeof(smi.roles_required) = 'array'
  AND jsonb_array_length(smi.roles_required) > 0
ON CONFLICT (sidebar_item_id, role_id) DO NOTHING;

-- 2. LIMPAR campo roles_required (setar como array vazio)
UPDATE sidebar_menu_items 
SET roles_required = '[]'::jsonb
WHERE roles_required IS NOT NULL 
  AND jsonb_typeof(roles_required) = 'array'
  AND jsonb_array_length(roles_required) > 0;

-- 3. LIMPAR permission_required se tiver dados estranhos
UPDATE sidebar_menu_items 
SET permission_required = NULL
WHERE permission_required IS NOT NULL 
  AND permission_required::text IN ('[]', '""[]""', '');

COMMIT;

-- ================================================================
-- VERIFICAÇÃO
-- ================================================================
SELECT 
    'ANTES DA MIGRACAO' as etapa,
    '' as campo,
    '' as status,
    '' as quantidade;

-- Mostrar resultado da migração
SELECT 
    'DEPOIS DA MIGRACAO' as etapa,
    'sidebar_item_roles' as campo,
    'Total de associações' as status,
    COUNT(*)::text as quantidade
FROM sidebar_item_roles

UNION ALL

SELECT 
    'DEPOIS DA MIGRACAO' as etapa,
    'roles_required' as campo,
    'COM DADOS (deve ser 0)' as status,
    COUNT(*)::text
FROM sidebar_menu_items
WHERE roles_required IS NOT NULL 
  AND jsonb_typeof(roles_required) = 'array'
  AND jsonb_array_length(roles_required) > 0

UNION ALL

SELECT 
    'DEPOIS DA MIGRACAO' as etapa,
    'roles_required' as campo,
    'ARRAY VAZIO (deve ser todos)' as status,
    COUNT(*)::text
FROM sidebar_menu_items
WHERE roles_required IS NULL OR roles_required::text = '[]'

UNION ALL

SELECT 
    'DEPOIS DA MIGRACAO' as etapa,
    'permission_required' as campo,
    'NULL (limpo)' as status,
    COUNT(*)::text
FROM sidebar_menu_items
WHERE permission_required IS NULL;

-- ================================================================
-- EXEMPLO DE DADOS MIGRADOS
-- ================================================================
SELECT 
    '' as separador,
    '' as menu,
    '' as perfis;

SELECT 
    'EXEMPLO (primeiros 10)' as separador,
    '' as menu,
    '' as perfis;

SELECT 
    'Exemplo' as separador,
    smi.name as menu,
    STRING_AGG(ur.name, ', ' ORDER BY ur.name) as perfis
FROM sidebar_menu_items smi
LEFT JOIN sidebar_item_roles sir ON smi.id = sir.sidebar_item_id
LEFT JOIN user_roles ur ON sir.role_id = ur.id
GROUP BY smi.id, smi.name
ORDER BY smi.order_index
LIMIT 10;

-- ================================================================
-- RESULTADO ESPERADO:
-- - sidebar_item_roles deve ter ~29+ registros
-- - roles_required COM DADOS deve ser 0
-- - roles_required ARRAY VAZIO deve ser ~36 (todos)
-- ================================================================



