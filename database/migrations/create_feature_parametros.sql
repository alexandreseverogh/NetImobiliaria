-- Migration: Criar funcionalidade Parametros (tipo EXECUTE)
-- Data: 2025-01-XX
-- Descrição: Cria funcionalidade Parametros do tipo EXECUTE em /admin/parametros

BEGIN;

-- Buscar categoria "Configurações" ou criar se não existir
DO $$
DECLARE
    categoria_id INTEGER;
BEGIN
    -- Tentar encontrar categoria "Configurações"
    SELECT id INTO categoria_id 
    FROM system_feature_categories 
    WHERE LOWER(name) = LOWER('Configurações') 
    LIMIT 1;
    
    -- Se não existir, criar
    IF categoria_id IS NULL THEN
        INSERT INTO system_feature_categories (name, description, is_active, created_at, updated_at)
        VALUES ('Configurações', 'Funcionalidades de configuração do sistema', true, NOW(), NOW())
        RETURNING id INTO categoria_id;
    END IF;
    
    -- Criar funcionalidade Parametros
    INSERT INTO system_features (
        name, 
        description, 
        category_id, 
        url, 
        slug,
        "Crud_Execute", 
        is_active, 
        created_at, 
        updated_at
    )
    VALUES (
        'Parametros',
        'Gerenciar parâmetros gerais do sistema (valor de destaque nacional)',
        categoria_id,
        '/admin/parametros',
        'parametros',
        'EXECUTE',
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (name) DO UPDATE 
    SET slug = 'parametros',
        "Crud_Execute" = 'EXECUTE',
        url = '/admin/parametros';
    
    RAISE NOTICE 'Funcionalidade Parametros criada com sucesso';
END $$;

-- Criar permissão EXECUTE para a funcionalidade Parametros
DO $$
DECLARE
    feature_id INTEGER;
    permission_id INTEGER;
BEGIN
    -- Buscar ID da funcionalidade Parametros
    SELECT id INTO feature_id 
    FROM system_features 
    WHERE name = 'Parametros' 
    LIMIT 1;
    
    IF feature_id IS NOT NULL THEN
        -- Criar permissão EXECUTE (se não existir)
        INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
        SELECT 
            feature_id,
            'execute',
            'Executar Parametros',
            NOW(),
            NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM permissions 
            WHERE feature_id = feature_id AND action = 'execute'
        )
        RETURNING id INTO permission_id;
        
        -- Atribuir permissão ao Super Admin e Administrador
        INSERT INTO role_permissions (role_id, permission_id, created_at)
        SELECT 
            ur.id,
            permission_id,
            NOW()
        FROM user_roles ur
        CROSS JOIN permissions p
        WHERE ur.name IN ('Super Admin', 'Administrador')
        AND p.id = permission_id
        AND NOT EXISTS (
            SELECT 1 FROM role_permissions 
            WHERE role_id = ur.id AND permission_id = p.id
        );
        
        RAISE NOTICE 'Permissão EXECUTE criada e atribuída aos roles administrativos';
    END IF;
END $$;

-- Criar entradas na tabela route_permissions_config
DO $$
DECLARE
    feature_id INTEGER;
BEGIN
    -- Buscar ID da funcionalidade Parametros
    SELECT id INTO feature_id 
    FROM system_features 
    WHERE name = 'Parametros' 
    LIMIT 1;
    
    IF feature_id IS NOT NULL THEN
        -- Rota da página (GET)
        INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, is_active)
        VALUES ('/admin/parametros', 'GET', feature_id, 'EXECUTE', true, true)
        ON CONFLICT (route_pattern, method) DO UPDATE 
        SET feature_id = EXCLUDED.feature_id, 
            default_action = EXCLUDED.default_action;
        
        -- Rota da API GET
        INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, is_active)
        VALUES ('/api/admin/parametros', 'GET', feature_id, 'EXECUTE', true, true)
        ON CONFLICT (route_pattern, method) DO UPDATE 
        SET feature_id = EXCLUDED.feature_id, 
            default_action = EXCLUDED.default_action;
        
        -- Rota da API PUT
        INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, is_active)
        VALUES ('/api/admin/parametros', 'PUT', feature_id, 'EXECUTE', true, true)
        ON CONFLICT (route_pattern, method) DO UPDATE 
        SET feature_id = EXCLUDED.feature_id, 
            default_action = EXCLUDED.default_action;
        
        RAISE NOTICE 'Rotas criadas na tabela route_permissions_config';
    END IF;
END $$;

COMMIT;

-- Verificação
SELECT 
    sf.name as funcionalidade,
    sf."Crud_Execute" as tipo,
    sf.url,
    COUNT(DISTINCT p.id) as total_permissoes,
    COUNT(DISTINCT rpc.id) as total_rotas_configuradas
FROM system_features sf
LEFT JOIN permissions p ON p.feature_id = sf.id
LEFT JOIN route_permissions_config rpc ON rpc.feature_id = sf.id
WHERE sf.name = 'Parametros'
GROUP BY sf.id, sf.name, sf."Crud_Execute", sf.url;

