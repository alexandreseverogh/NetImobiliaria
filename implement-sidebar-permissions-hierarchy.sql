-- ========================================
-- IMPLEMENTAR SIDEBAR HIERÁRQUICA + PERMISSÕES
-- ========================================
-- 
-- Este script implementa a visão correta:
-- - 1 Categoria = Múltiplas Funcionalidades
-- - Categorias = Agrupamento visual (sidebar)
-- - Funcionalidades = Permissões reais (RBAC)
-- - Sidebar dinâmica baseada nas permissões do usuário

-- 1. VER SITUAÇÃO ATUAL DAS CATEGORIAS
SELECT 
    'CATEGORIAS ATUAIS' as tipo,
    sc.id,
    sc.name as categoria,
    sc.slug,
    sc.description,
    COUNT(sf.id) as funcionalidades_vinculadas
FROM system_categorias sc
LEFT JOIN system_features sf ON sc.id = sf.category_id
GROUP BY sc.id, sc.name, sc.slug, sc.description
ORDER BY sc.name;

-- 2. VER FUNCIONALIDADES COM CATEGORIA E PERMISSÕES
SELECT 
    'FUNCIONALIDADES COM CATEGORIA' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sf.category_id,
    sc.name as categoria,
    sc.slug as categoria_slug,
    COUNT(p.id) as permissoes_existentes
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf.category_id IS NOT NULL
GROUP BY sf.id, sf.name, sf.category_id, sc.name, sc.slug
ORDER BY sc.name, sf.name;

-- 3. VER FUNCIONALIDADES SEM CATEGORIA
SELECT 
    'FUNCIONALIDADES SEM CATEGORIA' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sf.description
FROM system_features sf
WHERE sf.category_id IS NULL
ORDER BY sf.name;

-- 4. VER PERMISSÕES EXISTENTES POR FUNCIONALIDADE
SELECT 
    'PERMISSÕES EXISTENTES' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sc.name as categoria,
    p.action,
    COUNT(rp.role_id) as roles_com_permissao
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
LEFT JOIN permissions p ON sf.id = p.feature_id
LEFT JOIN role_permissions rp ON p.id = rp.permission_id
GROUP BY sf.id, sf.name, sc.name, p.action
ORDER BY sc.name, sf.name, p.action;

-- 5. VER RELACIONAMENTOS VIA system_feature_categorias
SELECT 
    'RELACIONAMENTOS VIA system_feature_categorias' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sfc.category_id,
    sc.name as categoria,
    sfc.sort_order
FROM system_features sf
JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
JOIN system_categorias sc ON sfc.category_id = sc.id
ORDER BY sc.name, sfc.sort_order, sf.name;

-- 6. VERIFICAR INCONSISTÊNCIAS ENTRE RELACIONAMENTOS
SELECT 
    'INCONSISTÊNCIAS' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sf.category_id as categoria_direta,
    sfc.category_id as categoria_via_juncao,
    CASE 
        WHEN sf.category_id = sfc.category_id THEN 'CONSISTENTE'
        ELSE 'INCONSISTENTE'
    END as status
FROM system_features sf
JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
ORDER BY sf.name;

-- 7. VER USUÁRIOS E SEUS PERFIS
SELECT 
    'USUÁRIOS E PERFIS' as tipo,
    u.id,
    u.username,
    r.name as role,
    r.level
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN roles r ON ura.role_id = r.id
ORDER BY u.username;

-- 8. VER PERMISSÕES POR PERFIL
SELECT 
    'PERMISSÕES POR PERFIL' as tipo,
    r.name as role,
    r.level,
    sf.name as funcionalidade,
    sc.name as categoria,
    p.action,
    COUNT(ura.user_id) as usuarios_com_permissao
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
LEFT JOIN user_role_assignments ura ON r.id = ura.role_id
GROUP BY r.name, r.level, sf.name, sc.name, p.action
ORDER BY r.level DESC, sc.name, sf.name, p.action;

-- 9. RESUMO PARA IMPLEMENTAÇÃO
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Categorias existentes: ' || (SELECT COUNT(*) FROM system_categorias) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Funcionalidades existentes: ' || (SELECT COUNT(*) FROM system_features) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Funcionalidades com categoria direta: ' || (SELECT COUNT(*) FROM system_features WHERE category_id IS NOT NULL) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Relacionamentos via system_feature_categorias: ' || (SELECT COUNT(*) FROM system_feature_categorias) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Permissões existentes: ' || (SELECT COUNT(*) FROM permissions) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Funcionalidades sem categoria: ' || (SELECT COUNT(*) FROM system_features WHERE category_id IS NULL) as info;
