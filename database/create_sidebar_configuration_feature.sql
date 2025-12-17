-- ============================================================
-- CRIAR FUNCIONALIDADE: CONFIGURAÇÃO DA SIDEBAR
-- Baseado no fluxo documentado em INTERFACE_GERENCIAMENTO_SIDEBAR.md
-- Data: 27/10/2025
-- ============================================================

-- 1. IDENTIFICAR CATEGORIA DE SISTEMA
DO $$
DECLARE
    system_category_id INTEGER;
    feature_id INTEGER;
BEGIN
    -- Buscar categoria "Sistema" ou "Painel do Sistema"
    SELECT id INTO system_category_id
    FROM system_categorias
    WHERE slug IN ('sistema', 'painel-do-sistema', 'admin')
       OR name ILIKE '%sistema%'
       OR name ILIKE '%painel%'
    LIMIT 1;

    -- Se não existe categoria, criar uma padrão
    IF system_category_id IS NULL THEN
        INSERT INTO system_categorias (name, slug, description, icon, color, sort_order, is_active, created_at, updated_at)
        VALUES ('Sistema', 'sistema', 'Funcionalidades do sistema administrativo', 'wrench', '#6B7280', 1, true, NOW(), NOW())
        RETURNING id INTO system_category_id;
        
        RAISE NOTICE 'Categoria "Sistema" criada com ID: %', system_category_id;
    ELSE
        RAISE NOTICE 'Usando categoria existente com ID: %', system_category_id;
    END IF;

    -- 2. CRIAR FUNCIONALIDADE EM SYSTEM_FEATURES
    -- Verificar se já existe
    SELECT id INTO feature_id
    FROM system_features
    WHERE name = 'Configuração da Sidebar'
       OR url = '/admin/configuracoes/sidebar'
    LIMIT 1;

    IF feature_id IS NULL THEN
        -- Criar funcionalidade (sem created_by pois pode ser NULL)
        INSERT INTO system_features (
            name,
            description,
            category_id,
            url,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            'Configuração da Sidebar',
            'Interface para gerenciar dinamicamente a estrutura da sidebar administrativa, permitindo criar, editar e reordenar menus e submenus',
            system_category_id,
            '/admin/configuracoes/sidebar',
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO feature_id;
        
        RAISE NOTICE 'Funcionalidade "Configuração da Sidebar" criada com ID: %', feature_id;
    ELSE
        RAISE NOTICE 'Funcionalidade já existe com ID: %', feature_id;
    END IF;

    -- 3. CRIAR PERMISSÕES PARA A FUNCIONALIDADE
    IF feature_id IS NOT NULL THEN
        -- Verificar se permissões já existem (usar diferente nome de variável para evitar ambiguidade)
        DECLARE
            v_feature_id INTEGER := feature_id;
            v_permission_exists BOOLEAN;
        BEGIN
            SELECT EXISTS (
                SELECT 1 FROM permissions p 
                WHERE p.feature_id = v_feature_id AND p.action = 'ADMIN'
            ) INTO v_permission_exists;
            
            IF NOT v_permission_exists THEN
                INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
                VALUES (
                    v_feature_id,
                    'ADMIN',
                    'Acesso administrativo a Configuração da Sidebar',
                    NOW(),
                    NOW()
                );
                RAISE NOTICE 'Permissão ADMIN criada para funcionalidade ID: %', v_feature_id;
            ELSE
                RAISE NOTICE 'Permissão ADMIN já existe para funcionalidade ID: %', v_feature_id;
            END IF;
        END;
    END IF;

END $$;

-- 4. VERIFICAR FUNCIONALIDADE CRIADA
SELECT 
    sf.id as feature_id,
    sf.name as feature_name,
    sf.url,
    sf.is_active,
    sc.name as category_name,
    COUNT(p.id) as permissions_count
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf.name = 'Configuração da Sidebar'
   OR sf.url = '/admin/configuracoes/sidebar'
GROUP BY sf.id, sf.name, sf.url, sf.is_active, sc.name;

-- 5. ADICIONAR À SIDEBAR (SUBITEM DE "Painel do Sistema")
DO $$
DECLARE
    painel_sistema_id INTEGER;
    sidebar_feature_id INTEGER;
BEGIN
    -- Buscar ID do menu "Painel do Sistema"
    SELECT id INTO painel_sistema_id
    FROM sidebar_menu_items
    WHERE name = 'Painel do Sistema'
      AND parent_id IS NULL
    LIMIT 1;

    IF painel_sistema_id IS NULL THEN
        RAISE NOTICE 'Menu "Painel do Sistema" não encontrado. Execute populate_sidebar_menu.sql primeiro!';
        RETURN;
    END IF;

    -- Buscar ID da funcionalidade criada
    SELECT id INTO sidebar_feature_id
    FROM system_features
    WHERE name = 'Configuração da Sidebar'
       OR url = '/admin/configuracoes/sidebar'
    LIMIT 1;

    -- Verificar se item já existe na sidebar
    IF NOT EXISTS (
        SELECT 1 FROM sidebar_menu_items
        WHERE parent_id = painel_sistema_id
          AND name = 'Configuração da Sidebar'
          AND url = '/admin/configuracoes/sidebar'
    ) THEN
        -- Adicionar item à sidebar (sem created_by pois pode ser NULL)
        INSERT INTO sidebar_menu_items (
            parent_id,
            name,
            icon_name,
            url,
            resource,
            order_index,
            is_active,
            roles_required,
            description,
            created_at,
            updated_at
        ) VALUES (
            painel_sistema_id,
            'Configuração da Sidebar',
            'cog',
            '/admin/configuracoes/sidebar',
            'system-features',
            (SELECT COALESCE(MAX(order_index), 0) + 1 FROM sidebar_menu_items WHERE parent_id = painel_sistema_id),
            true,
            '["Super Admin", "Administrador"]'::jsonb,
            'Interface para gerenciar a estrutura da sidebar',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Item adicionado à sidebar com sucesso!';
    ELSE
        RAISE NOTICE 'Item já existe na sidebar';
    END IF;

END $$;

-- 6. VERIFICAR ESTRUTURA FINAL
SELECT 
    smi.id,
    smi.name,
    smi.icon_name,
    smi.url,
    smi.order_index,
    smi.is_active,
    (SELECT name FROM sidebar_menu_items WHERE id = smi.parent_id) as parent_name,
    sf.name as feature_name
FROM sidebar_menu_items smi
LEFT JOIN system_features sf ON smi.url = sf.url
WHERE smi.name = 'Configuração da Sidebar'
   OR smi.url = '/admin/configuracoes/sidebar';
