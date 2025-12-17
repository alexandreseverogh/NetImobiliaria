-- Migration: Corrigir funcionalidade Receitas de Destaques para aparecer na sidebar
-- Data: 2025-01-XX
-- Descrição: Garante que a funcionalidade tenha category_id e esteja configurada corretamente

-- 1. Verificar situação atual
SELECT 
    'SITUAÇÃO ATUAL' as tipo,
    sf.id,
    sf.name,
    sf.category_id,
    sf.is_active,
    sf.slug,
    sc.name as categoria_nome,
    sc.slug as categoria_slug
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
WHERE sf.id = 57 OR sf.slug = 'receitas-destaques';

-- 2. Buscar ou criar categoria "Relatórios" ou "Dashboards"
DO $$
DECLARE
    v_feature_id INTEGER := 57;
    v_category_id INTEGER;
    v_category_name VARCHAR(100);
BEGIN
    -- Tentar encontrar categoria "Relatórios" ou "Dashboards"
    SELECT id, name INTO v_category_id, v_category_name
    FROM system_categorias
    WHERE LOWER(name) IN ('relatórios', 'relatorios', 'dashboards', 'dashboard')
    AND is_active = true
    ORDER BY CASE 
        WHEN LOWER(name) = 'relatórios' THEN 1
        WHEN LOWER(name) = 'relatorios' THEN 2
        WHEN LOWER(name) = 'dashboards' THEN 3
        WHEN LOWER(name) = 'dashboard' THEN 4
    END
    LIMIT 1;
    
    -- Se não encontrou, criar categoria "Relatórios"
    IF v_category_id IS NULL THEN
        INSERT INTO system_categorias (name, slug, description, icon, color, sort_order, is_active, created_at, updated_at)
        VALUES (
            'Relatórios',
            'relatorios',
            'Funcionalidades de relatórios e visualizações',
            'ChartBarIcon',
            '#10B981',
            7,
            true,
            NOW(),
            NOW()
        )
        RETURNING id, name INTO v_category_id, v_category_name;
        
        RAISE NOTICE 'Categoria "Relatórios" criada: ID = %', v_category_id;
    ELSE
        RAISE NOTICE 'Categoria encontrada: % (ID = %)', v_category_name, v_category_id;
    END IF;
    
    -- Atualizar funcionalidade com category_id
    UPDATE system_features
    SET category_id = v_category_id,
        is_active = true,
        updated_at = NOW()
    WHERE id = v_feature_id
    AND (category_id IS NULL OR category_id != v_category_id OR is_active = false);
    
    IF FOUND THEN
        RAISE NOTICE 'Funcionalidade atualizada com category_id = %', v_category_id;
    ELSE
        RAISE NOTICE 'Funcionalidade já estava configurada corretamente';
    END IF;
END $$;

-- 3. Verificar se role_permissions tem coluna is_active e criar se necessário
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
        ADD COLUMN is_active BOOLEAN DEFAULT true;
        
        -- Atualizar registros existentes para true
        UPDATE role_permissions SET is_active = true WHERE is_active IS NULL;
        
        RAISE NOTICE 'Coluna is_active adicionada à tabela role_permissions';
    ELSE
        RAISE NOTICE 'Coluna is_active já existe na tabela role_permissions';
    END IF;
END $$;

-- 4. Garantir que todas as role_permissions da funcionalidade estão ativas
UPDATE role_permissions rp
SET is_active = true
FROM permissions p
WHERE rp.permission_id = p.id
AND p.feature_id = 57
AND (rp.is_active IS NULL OR rp.is_active = false);

-- 5. Verificar permissões do usuário admin/admin123
SELECT 
    'PERMISSÕES DO USUÁRIO ADMIN' as tipo,
    u.username,
    ur.name as role,
    sf.name as funcionalidade,
    p.action,
    rp.is_active as role_permission_ativo,
    ura.is_active as user_role_ativo
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
AND sf.id = 57;

-- 6. Verificação final
SELECT 
    'VERIFICAÇÃO FINAL' as tipo,
    sf.id,
    sf.name,
    sf.category_id,
    sc.name as categoria,
    sf.is_active as funcionalidade_ativa,
    COUNT(DISTINCT p.id) as total_permissoes,
    COUNT(DISTINCT rp.id) as total_role_permissions,
    COUNT(DISTINCT CASE WHEN rp.is_active = true THEN rp.id END) as role_permissions_ativas
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
LEFT JOIN permissions p ON p.feature_id = sf.id
LEFT JOIN role_permissions rp ON rp.permission_id = p.id
WHERE sf.id = 57
GROUP BY sf.id, sf.name, sf.category_id, sc.name, sf.is_active;







