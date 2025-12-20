-- Script de Correção COMPLETA: Garantir que Receitas de Destaques apareça no menu
-- Este script corrige TODOS os problemas possíveis

-- ============================================
-- PARTE 1: GARANTIR QUE FUNCIONALIDADE ESTÁ ATIVA
-- ============================================
UPDATE system_features
SET is_active = true,
    updated_at = NOW()
WHERE (id = 57 OR slug = 'receitas-destaques')
AND is_active = false;

-- ============================================
-- PARTE 2: BUSCAR OU CRIAR CATEGORIA "Painel Administrativo"
-- ============================================
DO $$
DECLARE
    v_category_id INTEGER;
    v_category_name VARCHAR(100);
BEGIN
    -- Tentar encontrar categoria "Painel Administrativo"
    SELECT id, name INTO v_category_id, v_category_name
    FROM system_categorias
    WHERE LOWER(name) IN ('painel administrativo', 'administrativo', 'admin')
    AND is_active = true
    ORDER BY CASE 
        WHEN LOWER(name) = 'painel administrativo' THEN 1
        WHEN LOWER(name) = 'administrativo' THEN 2
        WHEN LOWER(name) = 'admin' THEN 3
    END
    LIMIT 1;
    
    -- Se não encontrou, criar categoria "Painel Administrativo"
    IF v_category_id IS NULL THEN
        INSERT INTO system_categorias (name, slug, description, icon, color, sort_order, is_active, created_at, updated_at)
        VALUES (
            'Painel Administrativo',
            'painel-administrativo',
            'Funcionalidades do painel administrativo',
            'ShieldCheckIcon',
            '#3B82F6',
            2,
            true,
            NOW(),
            NOW()
        )
        RETURNING id, name INTO v_category_id, v_category_name;
        
        RAISE NOTICE '✅ Categoria "Painel Administrativo" criada: ID = %', v_category_id;
    ELSE
        RAISE NOTICE '✅ Categoria encontrada: % (ID = %)', v_category_name, v_category_id;
    END IF;
    
    -- Atualizar funcionalidade com category_id
    UPDATE system_features
    SET category_id = v_category_id,
        is_active = true,
        updated_at = NOW()
    WHERE (id = 57 OR slug = 'receitas-destaques')
    AND (category_id IS NULL OR category_id != v_category_id);
    
    IF FOUND THEN
        RAISE NOTICE '✅ Funcionalidade atualizada com category_id = %', v_category_id;
    END IF;
END $$;

-- ============================================
-- PARTE 3: GARANTIR QUE COLUNA is_active EXISTE EM role_permissions
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'role_permissions' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE role_permissions 
        ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
        
        UPDATE role_permissions SET is_active = true WHERE is_active IS NULL;
        
        RAISE NOTICE '✅ Coluna is_active adicionada à tabela role_permissions';
    END IF;
END $$;

-- ============================================
-- PARTE 4: GARANTIR QUE PERMISSÃO EXECUTE EXISTE
-- ============================================
DO $$
DECLARE
    v_feature_id INTEGER := 57;
    v_permission_id INTEGER;
BEGIN
    SELECT id INTO v_permission_id 
    FROM permissions 
    WHERE feature_id = v_feature_id AND action = 'execute';
    
    IF v_permission_id IS NULL THEN
        INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
        VALUES (v_feature_id, 'execute', 'Visualizar Receitas de Destaques', NOW(), NOW())
        RETURNING id INTO v_permission_id;
        
        RAISE NOTICE '✅ Permissão EXECUTE criada: ID = %', v_permission_id;
    ELSE
        RAISE NOTICE 'ℹ️ Permissão EXECUTE já existe: ID = %', v_permission_id;
    END IF;
END $$;

-- ============================================
-- PARTE 5: GARANTIR QUE PERMISSÃO ESTÁ ATRIBUÍDA AOS ROLES ADMINISTRATIVOS E ATIVA
-- ============================================
DO $$
DECLARE
    v_permission_id INTEGER;
    v_role_id INTEGER;
BEGIN
    -- Buscar ID da permissão
    SELECT id INTO v_permission_id
    FROM permissions
    WHERE feature_id = 57 AND action = 'execute';
    
    IF v_permission_id IS NOT NULL THEN
        -- Para cada role administrativo
        FOR v_role_id IN 
            SELECT id FROM user_roles 
            WHERE name IN ('Super Admin', 'Administrador')
            AND is_active = true
        LOOP
            -- Verificar se já existe
            IF EXISTS (
                SELECT 1 FROM role_permissions
                WHERE role_id = v_role_id AND permission_id = v_permission_id
            ) THEN
                -- Garantir que está ativo
                UPDATE role_permissions
                SET is_active = true
                WHERE role_id = v_role_id AND permission_id = v_permission_id;
                
                RAISE NOTICE '✅ Permissão garantida como ativa para role ID = %', v_role_id;
            ELSE
                -- Criar role_permission
                INSERT INTO role_permissions (role_id, permission_id, is_active)
                VALUES (v_role_id, v_permission_id, true);
                
                RAISE NOTICE '✅ Permissão criada e atribuída ao role ID = %', v_role_id;
            END IF;
        END LOOP;
    END IF;
END $$;

-- ============================================
-- PARTE 6: GARANTIR QUE USER_ROLE_ASSIGNMENTS ESTÁ ATIVO PARA ADMIN
-- ============================================
DO $$
DECLARE
    v_user_id UUID;
    v_role_id INTEGER;
BEGIN
    -- Buscar ID do usuário admin
    SELECT id INTO v_user_id
    FROM users
    WHERE username = 'admin'
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- Buscar roles administrativos
        FOR v_role_id IN 
            SELECT id FROM user_roles 
            WHERE name IN ('Super Admin', 'Administrador')
            AND is_active = true
        LOOP
            -- Verificar se existe user_role_assignment
            IF EXISTS (
                SELECT 1 FROM user_role_assignments
                WHERE user_id = v_user_id AND role_id = v_role_id
            ) THEN
                -- Garantir que está ativo
                UPDATE user_role_assignments
                SET is_active = true
                WHERE user_id = v_user_id AND role_id = v_role_id;
                
                RAISE NOTICE '✅ User role assignment garantido como ativo para admin (role ID = %)', v_role_id;
            ELSE
                -- Criar user_role_assignment
                INSERT INTO user_role_assignments (user_id, role_id, is_active, assigned_at)
                VALUES (v_user_id, v_role_id, true, NOW());
                
                RAISE NOTICE '✅ User role assignment criado para admin (role ID = %)', v_role_id;
            END IF;
        END LOOP;
    END IF;
END $$;

-- ============================================
-- PARTE 7: VERIFICAÇÃO FINAL
-- ============================================
SELECT 
    '=== VERIFICAÇÃO FINAL ===' as tipo,
    sf.id,
    sf.name,
    sf.category_id,
    sc.name as categoria,
    sf.is_active as funcionalidade_ativa,
    COUNT(DISTINCT p.id) as total_permissoes,
    COUNT(DISTINCT rp.id) as total_role_permissions,
    COUNT(DISTINCT CASE WHEN rp.is_active = true THEN rp.id END) as role_permissions_ativas,
    COUNT(DISTINCT ura.id) as total_user_role_assignments,
    COUNT(DISTINCT CASE WHEN ura.is_active = true THEN ura.id END) as ura_ativas
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
LEFT JOIN permissions p ON p.feature_id = sf.id
LEFT JOIN role_permissions rp ON rp.permission_id = p.id
LEFT JOIN user_role_assignments ura ON rp.role_id = ura.role_id
LEFT JOIN users u ON ura.user_id = u.id AND u.username = 'admin'
WHERE sf.id = 57
GROUP BY sf.id, sf.name, sf.category_id, sc.name, sf.is_active;

-- ============================================
-- PARTE 8: TESTE FINAL - SIMULAÇÃO DA QUERY DA API
-- ============================================
SELECT 
    '=== TESTE FINAL: QUERY DA API ===' as tipo,
    sf.id,
    sf.name,
    sf.category_id,
    sc.name as category_name,
    CASE 
        WHEN sf.is_active = true 
        AND sf.category_id IS NOT NULL
        AND rp.is_active = true 
        AND ura.is_active = true 
        AND u.username = 'admin'
        THEN '✅ DEVE APARECER NO MENU'
        ELSE '❌ NÃO DEVE APARECER - VERIFICAR PROBLEMAS ACIMA'
    END as resultado
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
JOIN permissions p ON sf.id = p.feature_id AND p.action = 'execute'
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN user_role_assignments ura ON rp.role_id = ura.role_id
JOIN users u ON ura.user_id = u.id
WHERE u.username = 'admin'
AND sf.id = 57;








