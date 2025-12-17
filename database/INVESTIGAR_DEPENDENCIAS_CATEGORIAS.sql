-- ============================================================
-- INVESTIGAÇÃO DE DEPENDÊNCIAS - CATEGORIAS DE FUNCIONALIDADES
-- ============================================================
-- Objetivo: Identificar qual funcionalidade pode ser removida com segurança
-- ============================================================

-- 1. Verificar associações com tabela permissions
SELECT 
    'Permissões' as tabela,
    sf.id,
    sf.name,
    COUNT(p.id) as registros_associados
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf.name = 'Categorias de Funcionalidades'
GROUP BY sf.id, sf.name
ORDER BY sf.id;

-- 2. Verificar associações com tabela sidebar_menu_items
SELECT 
    'Sidebar Menu Items' as tabela,
    sf.id,
    sf.name,
    COUNT(smi.id) as registros_associados
FROM system_features sf
LEFT JOIN sidebar_menu_items smi ON sf.id = smi.feature_id
WHERE sf.name = 'Categorias de Funcionalidades'
GROUP BY sf.id, sf.name
ORDER BY sf.id;

-- 3. Verificar associações com tabela role_permissions (via permissions)
SELECT 
    'Role Permissions' as tabela,
    sf.id,
    sf.name,
    COUNT(rp.id) as registros_associados
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
LEFT JOIN role_permissions rp ON p.id = rp.permission_id
WHERE sf.name = 'Categorias de Funcionalidades'
GROUP BY sf.id, sf.name
ORDER BY sf.id;

-- 4. Verificar detalhes das funcionalidades
SELECT 
    sf.id,
    sf.name,
    sf.description,
    sf.url,
    sf.created_at,
    sf.updated_at,
    sf.category_id
FROM system_features sf
WHERE sf.name = 'Categorias de Funcionalidades'
ORDER BY sf.id;

-- 5. Resumo de dependências
SELECT 
    sf.id,
    sf.name,
    COUNT(DISTINCT p.id) as total_permissoes,
    COUNT(DISTINCT smi.id) as total_sidebar_items,
    COUNT(DISTINCT rp.id) as total_role_permissions,
    CASE 
        WHEN COUNT(DISTINCT p.id) = 0 AND COUNT(DISTINCT smi.id) = 0 AND COUNT(DISTINCT rp.id) = 0 
        THEN '✅ PODE SER REMOVIDA'
        ELSE '❌ TEM DEPENDÊNCIAS'
    END as status_remocao
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
LEFT JOIN sidebar_menu_items smi ON sf.id = smi.feature_id
LEFT JOIN role_permissions rp ON p.id = rp.permission_id
WHERE sf.name = 'Categorias de Funcionalidades'
GROUP BY sf.id, sf.name
ORDER BY sf.id;
