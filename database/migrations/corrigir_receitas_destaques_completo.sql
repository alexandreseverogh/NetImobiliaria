-- Migration: Correção COMPLETA da funcionalidade Receitas de Destaques
-- Este script corrige TODOS os problemas que impedem a funcionalidade de aparecer na sidebar

-- ============================================
-- PARTE 1: VERIFICAÇÃO INICIAL
-- ============================================
SELECT '=== VERIFICAÇÃO INICIAL ===' as info;

SELECT 
    'Funcionalidade' as tipo,
    sf.id,
    sf.name,
    sf.category_id,
    sf.is_active,
    sc.name as categoria
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
WHERE sf.id = 57 OR sf.slug = 'receitas-destaques';

-- ============================================
-- PARTE 2: GARANTIR QUE A FUNCIONALIDADE ESTÁ ATIVA
-- ============================================
UPDATE system_features
SET is_active = true,
    updated_at = NOW()
WHERE id = 57
AND is_active = false;

-- ============================================
-- PARTE 3: BUSCAR OU CRIAR CATEGORIA "Painel Administrativo"
-- ============================================
DO $$
DECLARE
    v_category_id INTEGER;
    v_category_name VARCHAR(100);
BEGIN
    -- Tentar encontrar categoria "Painel Administrativo" ou similar
    SELECT id, name INTO v_category_id, v_category_name
    FROM system_categorias
    WHERE LOWER(name) IN ('painel administrativo', 'painel administrativo', 'administrativo', 'admin')
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
    WHERE id = 57
    AND (category_id IS NULL OR category_id != v_category_id);
    
    IF FOUND THEN
        RAISE NOTICE '✅ Funcionalidade atualizada com category_id = % (Painel Administrativo)', v_category_id;
    ELSE
        RAISE NOTICE 'ℹ️ Funcionalidade já tinha category_id configurado';
    END IF;
END $$;

-- ============================================
-- PARTE 4: VERIFICAR/CRIAR COLUNA is_active EM role_permissions
-- ============================================
DO $$
BEGIN
    -- Verificar se a coluna existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'role_permissions' 
        AND column_name = 'is_active'
    ) THEN
        -- Adicionar coluna is_active com default true
        ALTER TABLE role_permissions 
        ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
        
        -- Atualizar registros existentes para true
        UPDATE role_permissions SET is_active = true WHERE is_active IS NULL;
        
        RAISE NOTICE '✅ Coluna is_active adicionada à tabela role_permissions';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna is_active já existe na tabela role_permissions';
    END IF;
END $$;

-- ============================================
-- PARTE 5: GARANTIR QUE PERMISSÃO EXECUTE EXISTE
-- ============================================
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
        
        RAISE NOTICE '✅ Permissão EXECUTE criada: ID = %', v_permission_id;
    ELSE
        RAISE NOTICE 'ℹ️ Permissão EXECUTE já existe: ID = %', v_permission_id;
    END IF;
END $$;

-- ============================================
-- PARTE 6: GARANTIR QUE PERMISSÃO ESTÁ ATRIBUÍDA AOS ROLES ADMINISTRATIVOS
-- ============================================
DO $$
DECLARE
    v_permission_id INTEGER;
    v_role_id INTEGER;
    v_count INTEGER;
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
        LOOP
            -- Verificar se já existe
            SELECT COUNT(*) INTO v_count
            FROM role_permissions
            WHERE role_id = v_role_id AND permission_id = v_permission_id;
            
            IF v_count = 0 THEN
                -- Criar role_permission
                INSERT INTO role_permissions (role_id, permission_id, is_active)
                VALUES (v_role_id, v_permission_id, true);
                
                RAISE NOTICE '✅ Permissão atribuída ao role ID = %', v_role_id;
            ELSE
                -- Garantir que está ativa
                UPDATE role_permissions
                SET is_active = true
                WHERE role_id = v_role_id AND permission_id = v_permission_id AND is_active = false;
                
                IF FOUND THEN
                    RAISE NOTICE '✅ Permissão ativada para role ID = %', v_role_id;
                END IF;
            END IF;
        END LOOP;
    END IF;
END $$;

-- ============================================
-- PARTE 7: GARANTIR QUE USER_ROLE_ASSIGNMENTS ESTÁ ATIVO PARA ADMIN
-- ============================================
DO $$
DECLARE
    v_user_id UUID;  -- CORRIGIDO: UUID em vez de INTEGER
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
        LOOP
            -- Verificar se existe user_role_assignment
            IF EXISTS (
                SELECT 1 FROM user_role_assignments
                WHERE user_id = v_user_id AND role_id = v_role_id
            ) THEN
                -- Garantir que está ativo
                UPDATE user_role_assignments
                SET is_active = true
                WHERE user_id = v_user_id AND role_id = v_role_id AND is_active = false;
                
                IF FOUND THEN
                    RAISE NOTICE '✅ User role assignment ativado para admin (role ID = %)', v_role_id;
                END IF;
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
-- PARTE 8: VERIFICAÇÃO FINAL COMPLETA
-- ============================================
SELECT '=== VERIFICAÇÃO FINAL ===' as info;

-- Verificar funcionalidade
SELECT 
    '1. Funcionalidade' as etapa,
    sf.id,
    sf.name,
    sf.category_id,
    sf.is_active,
    sc.name as categoria
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
WHERE sf.id = 57;

-- Verificar permissões
SELECT 
    '2. Permissões' as etapa,
    p.id,
    p.action,
    p.feature_id
FROM permissions p
WHERE p.feature_id = 57;

-- Verificar role_permissions
SELECT 
    '3. Role Permissions' as etapa,
    rp.id,
    ur.name as role,
    rp.is_active,
    p.action
FROM role_permissions rp
JOIN user_roles ur ON rp.role_id = ur.id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.feature_id = 57;

-- Verificar user_role_assignments do admin
SELECT 
    '4. User Role Assignments (admin)' as etapa,
    u.username,
    ur.name as role,
    ura.is_active
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin'
AND ur.name IN ('Super Admin', 'Administrador');

-- SIMULAÇÃO DA QUERY DA API
SELECT 
    '5. SIMULAÇÃO QUERY API' as etapa,
    sf.id,
    sf.name,
    sf.category_id,
    sc.name as category_name,
    p.action,
    rp.is_active as rp_ativo,
    ura.is_active as ura_ativo,
    u.username,
    CASE 
        WHEN sf.is_active = true AND rp.is_active = true AND ura.is_active = true 
        THEN '✅ DEVE APARECER'
        ELSE '❌ NÃO DEVE APARECER'
    END as resultado
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
JOIN permissions p ON sf.id = p.feature_id
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN user_role_assignments ura ON rp.role_id = ura.role_id
JOIN users u ON ura.user_id = u.id
WHERE u.username = 'admin'
AND sf.id = 57;

