-- ============================================================
-- ANÁLISE DETALHADA PARA DECISÃO DE REMOÇÃO
-- ============================================================

-- 1. Verificar quais roles têm permissões para cada funcionalidade
SELECT 
    sf.id,
    sf.name,
    ur.name as role_name,
    COUNT(rp.id) as permissoes_do_role
FROM system_features sf
JOIN permissions p ON sf.id = p.feature_id
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN user_roles ur ON rp.role_id = ur.id
WHERE sf.name = 'Categorias de Funcionalidades'
GROUP BY sf.id, sf.name, ur.name
ORDER BY sf.id, ur.name;

-- 2. Verificar detalhes do item da sidebar (apenas ID 1 tem)
SELECT 
    smi.id,
    smi.name,
    smi.url,
    smi.parent_id,
    smi.order_index,
    smi.is_active
FROM sidebar_menu_items smi
WHERE smi.feature_id = 1;

-- 3. Verificar se há usuários usando essas permissões
SELECT 
    sf.id,
    sf.name,
    COUNT(DISTINCT ura.user_id) as usuarios_com_acesso
FROM system_features sf
JOIN permissions p ON sf.id = p.feature_id
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN user_role_assignments ura ON rp.role_id = ura.role_id
WHERE sf.name = 'Categorias de Funcionalidades'
GROUP BY sf.id, sf.name
ORDER BY sf.id;

-- 4. Verificar qual foi criada mais recentemente (mais provável de ser duplicata)
SELECT 
    sf.id,
    sf.name,
    sf.created_at,
    sf.updated_at,
    CASE 
        WHEN sf.id = 1 THEN 'ORIGINAL'
        WHEN sf.id = 30 THEN 'DUPLICATA'
        ELSE 'OUTRA'
    END as tipo
FROM system_features sf
WHERE sf.name = 'Categorias de Funcionalidades'
ORDER BY sf.created_at;
