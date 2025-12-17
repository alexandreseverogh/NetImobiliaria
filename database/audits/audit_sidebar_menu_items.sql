-- ================================================================
-- AUDITORIA: sidebar_menu_items
-- ================================================================
-- Verificar inconsistências nos campos roles_required e permissions_required
-- ================================================================

-- ================================================================
-- 1. VERIFICAR TIPOS E VALORES DOS CAMPOS PROBLEMÁTICOS
-- ================================================================
SELECT 
    'ANALISE DE TIPOS' as categoria,
    '' as id,
    '' as name,
    '' as roles_required,
    '' as permission_required;

SELECT 
    'Dados' as categoria,
    id::text,
    name,
    CASE 
        WHEN roles_required IS NULL THEN 'NULL'
        WHEN roles_required::text = '[]' THEN 'ARRAY VAZIO'
        WHEN roles_required::text = '""[]""' THEN 'STRING VAZIA COM ARRAY'
        WHEN roles_required::text LIKE '%\\%' THEN 'COM ESCAPE CHARACTERS'
        ELSE LEFT(roles_required::text, 50)
    END as roles_required,
    CASE 
        WHEN permission_required IS NULL THEN 'NULL'
        WHEN permission_required::text = '[]' THEN 'ARRAY VAZIO'
        ELSE LEFT(permission_required::text, 50)
    END as permission_required
FROM sidebar_menu_items
ORDER BY id;

-- ================================================================
-- 2. CONTAR PADRÕES DIFERENTES
-- ================================================================
SELECT 
    '' as separador,
    '' as tipo,
    '' as quantidade;

SELECT 
    'RESUMO DE PADROES' as separador,
    '' as tipo,
    '' as quantidade;

SELECT 
    'roles_required' as separador,
    'NULL' as tipo,
    COUNT(*)::text as quantidade
FROM sidebar_menu_items
WHERE roles_required IS NULL

UNION ALL

SELECT 
    'roles_required' as separador,
    'ARRAY VAZIO []' as tipo,
    COUNT(*)::text
FROM sidebar_menu_items
WHERE roles_required::text = '[]'

UNION ALL

SELECT 
    'roles_required' as separador,
    'COM DADOS' as tipo,
    COUNT(*)::text
FROM sidebar_menu_items
WHERE roles_required IS NOT NULL AND roles_required::text != '[]'

UNION ALL

SELECT 
    'permission_required' as separador,
    'NULL' as tipo,
    COUNT(*)::text
FROM sidebar_menu_items
WHERE permission_required IS NULL

UNION ALL

SELECT 
    'permission_required' as separador,
    'ARRAY VAZIO []' as tipo,
    COUNT(*)::text
FROM sidebar_menu_items
WHERE permission_required::text = '[]'

UNION ALL

SELECT 
    'permission_required' as separador,
    'COM DADOS' as tipo,
    COUNT(*)::text
FROM sidebar_menu_items
WHERE permission_required IS NOT NULL AND permission_required::text != '[]';

-- ================================================================
-- 3. VERIFICAR SE FEATURE_ID ESTÁ PREENCHIDO (NOVO PADRÃO)
-- ================================================================
SELECT 
    '' as separador,
    '' as info,
    '' as total;

SELECT 
    'FEATURE_ID (NOVO PADRAO)' as separador,
    '' as info,
    '' as total;

SELECT 
    'feature_id' as separador,
    'NULL (problemático)' as info,
    COUNT(*)::text as total
FROM sidebar_menu_items
WHERE feature_id IS NULL

UNION ALL

SELECT 
    'feature_id' as separador,
    'PREENCHIDO (correto)' as info,
    COUNT(*)::text
FROM sidebar_menu_items
WHERE feature_id IS NOT NULL;

-- ================================================================
-- 4. VERIFICAR SIDEBAR_ITEM_ROLES (TABELA NORMALIZADA)
-- ================================================================
SELECT 
    '' as separador,
    '' as info,
    '' as total;

SELECT 
    'SIDEBAR_ITEM_ROLES (TABELA NORMALIZADA)' as separador,
    '' as info,
    '' as total;

SELECT 
    'Total de registros na sidebar_item_roles' as separador,
    '' as info,
    COUNT(*)::text as total
FROM sidebar_item_roles;

SELECT 
    'Itens SEM roles na tabela normalizada' as separador,
    '' as info,
    COUNT(DISTINCT smi.id)::text as total
FROM sidebar_menu_items smi
LEFT JOIN sidebar_item_roles sir ON smi.id = sir.sidebar_item_id
WHERE sir.id IS NULL;

-- ================================================================
-- 5. RECOMENDAÇÕES
-- ================================================================
SELECT 
    '' as separador,
    '' as recomendacao;

SELECT 
    'RECOMENDACOES' as separador,
    CASE 
        WHEN (SELECT COUNT(*) FROM sidebar_menu_items WHERE roles_required IS NOT NULL AND roles_required::text != '[]') > 0
        THEN 'DEPRECAR roles_required - migrar para sidebar_item_roles'
        ELSE 'roles_required ja esta limpo'
    END as recomendacao

UNION ALL

SELECT 
    'RECOMENDACOES' as separador,
    CASE 
        WHEN (SELECT COUNT(*) FROM sidebar_menu_items WHERE permission_required IS NOT NULL AND permission_required::text != '[]') > 0
        THEN 'DEPRECAR permission_required - usar feature_id'
        ELSE 'permission_required ja esta limpo'
    END;

