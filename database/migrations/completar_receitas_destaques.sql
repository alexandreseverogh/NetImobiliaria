-- Migration: Completar configuração da funcionalidade Receitas de Destaques (id = 57)
-- Data: 2025-01-XX
-- Descrição: Completa a configuração da funcionalidade já criada via UI

-- 1. Verificar o registro existente
SELECT 
    'VERIFICAÇÃO EXISTENTE' as tipo,
    sf.id,
    sf.name,
    sf.slug,
    sf.url,
    sf."Crud_Execute",
    sf.is_active
FROM system_features sf
WHERE sf.id = 57 OR sf.slug = 'receitas-destaques';

-- 2. Atualizar slug se necessário
UPDATE system_features 
SET slug = 'receitas-destaques',
    url = '/admin/receitas-destaques',
    "Crud_Execute" = 'EXECUTE'
WHERE id = 57 
  AND (slug IS NULL OR slug != 'receitas-destaques' OR url != '/admin/receitas-destaques');

-- 3. Criar permissão EXECUTE se não existir
DO $$
DECLARE
    v_feature_id INTEGER := 57;
    v_permission_id INTEGER;
BEGIN
    -- Verificar se já existe permissão
    SELECT id INTO v_permission_id 
    FROM permissions 
    WHERE permissions.feature_id = v_feature_id AND permissions.action = 'execute';
    
    IF v_permission_id IS NULL THEN
        -- Criar permissão EXECUTE
        INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
        VALUES (v_feature_id, 'execute', 'Visualizar Receitas de Destaques', NOW(), NOW())
        RETURNING id INTO v_permission_id;
        
        RAISE NOTICE 'Permissão EXECUTE criada: ID = %', v_permission_id;
    ELSE
        RAISE NOTICE 'Permissão EXECUTE já existe: ID = %', v_permission_id;
    END IF;
    
    -- Atribuir permissão ao Super Admin e Administrador
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT 
        ur.id,
        v_permission_id
    FROM user_roles ur
    WHERE ur.name IN ('Super Admin', 'Administrador')
    AND NOT EXISTS (
        SELECT 1 FROM role_permissions 
        WHERE role_permissions.role_id = ur.id AND role_permissions.permission_id = v_permission_id
    );
    
    RAISE NOTICE 'Permissão atribuída aos roles administrativos';
END $$;

-- 4. Criar entradas na tabela route_permissions_config se não existirem
DO $$
DECLARE
    v_feature_id INTEGER := 57;
BEGIN
    -- Rota da página (GET)
    INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, is_active)
    VALUES ('/admin/receitas-destaques', 'GET', v_feature_id, 'EXECUTE', true, true)
    ON CONFLICT (route_pattern, method) DO UPDATE 
    SET feature_id = EXCLUDED.feature_id, 
        default_action = EXCLUDED.default_action,
        is_active = true;
    
    -- Rota da API GET
    INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, is_active)
    VALUES ('/api/admin/receitas-destaques', 'GET', v_feature_id, 'EXECUTE', true, true)
    ON CONFLICT (route_pattern, method) DO UPDATE 
    SET feature_id = EXCLUDED.feature_id, 
        default_action = EXCLUDED.default_action,
        is_active = true;
    
    RAISE NOTICE 'Rotas criadas/atualizadas na tabela route_permissions_config';
END $$;

-- 5. Verificação final
SELECT 
    'VERIFICAÇÃO FINAL' as tipo,
    sf.id,
    sf.name,
    sf.slug,
    sf.url,
    sf."Crud_Execute",
    COUNT(DISTINCT p.id) as total_permissoes,
    COUNT(DISTINCT rp.id) as total_role_permissions,
    COUNT(DISTINCT rpc.id) as total_rotas_configuradas
FROM system_features sf
LEFT JOIN permissions p ON p.feature_id = sf.id
LEFT JOIN role_permissions rp ON rp.permission_id = p.id
LEFT JOIN route_permissions_config rpc ON rpc.feature_id = sf.id
WHERE sf.id = 57
GROUP BY sf.id, sf.name, sf.slug, sf.url, sf."Crud_Execute";

-- 6. Verificar permissões atribuídas aos roles
SELECT 
    'PERMISSÕES ATRIBUÍDAS' as tipo,
    ur.name as role,
    p.action,
    sf.name as funcionalidade
FROM role_permissions rp
JOIN user_roles ur ON rp.role_id = ur.id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.id = 57
ORDER BY ur.name, p.action;

