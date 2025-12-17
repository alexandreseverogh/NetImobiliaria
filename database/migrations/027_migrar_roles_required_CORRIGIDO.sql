-- ================================================================
-- MIGRATION 027: MIGRAR roles_required PARA sidebar_item_roles
-- ================================================================
-- Versão ROBUSTA: Trata escalares, strings e arrays
-- ================================================================

BEGIN;

-- PASSO 1: CORRIGIR tipos inválidos (escalares, strings, etc.)
-- Converter todos os não-arrays para array vazio
UPDATE sidebar_menu_items 
SET roles_required = '[]'::jsonb
WHERE roles_required IS NOT NULL 
  AND jsonb_typeof(roles_required) != 'array';

-- PASSO 2: MIGRAR dados válidos de roles_required para sidebar_item_roles
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

-- PASSO 3: LIMPAR campo roles_required (setar como array vazio)
UPDATE sidebar_menu_items 
SET roles_required = '[]'::jsonb
WHERE roles_required IS NOT NULL 
  AND jsonb_typeof(roles_required) = 'array'
  AND jsonb_array_length(roles_required) > 0;

-- PASSO 4: LIMPAR permission_required se tiver dados estranhos
UPDATE sidebar_menu_items 
SET permission_required = NULL
WHERE permission_required IS NOT NULL 
  AND (
    permission_required::text IN ('[]', '""[]""', '') 
    OR LENGTH(TRIM(permission_required::text)) = 0
  );

COMMIT;

-- ================================================================
-- VERIFICAÇÃO COMPLETA
-- ================================================================
SELECT 
    'RESULTADO' as secao,
    '' as campo,
    '' as status,
    '' as quantidade;

SELECT 
    'MIGRACAO' as secao,
    'sidebar_item_roles' as campo,
    'Total de associações criadas' as status,
    COUNT(*)::text as quantidade
FROM sidebar_item_roles

UNION ALL

SELECT 
    'LIMPEZA' as secao,
    'roles_required' as campo,
    'COM DADOS (deve ser 0)' as status,
    COUNT(*)::text
FROM sidebar_menu_items
WHERE roles_required IS NOT NULL 
  AND jsonb_typeof(roles_required) = 'array'
  AND jsonb_array_length(roles_required) > 0

UNION ALL

SELECT 
    'LIMPEZA' as secao,
    'roles_required' as campo,
    'LIMPO (deve ser todos)' as status,
    COUNT(*)::text
FROM sidebar_menu_items
WHERE roles_required IS NULL OR roles_required::text = '[]'

UNION ALL

SELECT 
    'LIMPEZA' as secao,
    'permission_required' as campo,
    'NULL (limpo)' as status,
    COUNT(*)::text
FROM sidebar_menu_items
WHERE permission_required IS NULL;

-- ================================================================
-- EXEMPLO: Menus com seus perfis permitidos
-- ================================================================
SELECT 
    '' as separador,
    '' as menu_name,
    '' as perfis_permitidos;

SELECT 
    'MENUS E PERFIS' as separador,
    '' as menu_name,
    '' as perfis_permitidos;

SELECT 
    'Dados' as separador,
    smi.name as menu_name,
    COALESCE(STRING_AGG(ur.name, ', ' ORDER BY ur.name), 'Nenhum perfil') as perfis_permitidos
FROM sidebar_menu_items smi
LEFT JOIN sidebar_item_roles sir ON smi.id = sir.sidebar_item_id
LEFT JOIN user_roles ur ON sir.role_id = ur.id
GROUP BY smi.id, smi.name
ORDER BY smi.order_index
LIMIT 15;

-- ================================================================
-- ✅ CONCLUSÃO: 
-- Se "roles_required COM DADOS" = 0, migração foi sucesso!
-- ================================================================



