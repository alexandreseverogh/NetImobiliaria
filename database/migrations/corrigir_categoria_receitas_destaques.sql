-- Script rápido: Corrigir categoria da funcionalidade Receitas de Destaques
-- De "Relatórios" para "Painel Administrativo"

-- 1. Buscar ou criar categoria "Painel Administrativo"
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
    
    -- Atualizar funcionalidade Receitas de Destaques
    UPDATE system_features
    SET category_id = v_category_id,
        updated_at = NOW()
    WHERE (id = 57 OR slug = 'receitas-destaques')
    AND category_id != v_category_id;
    
    IF FOUND THEN
        RAISE NOTICE '✅ Funcionalidade atualizada para categoria "Painel Administrativo" (ID = %)', v_category_id;
    ELSE
        RAISE NOTICE 'ℹ️ Funcionalidade já está na categoria correta';
    END IF;
END $$;

-- 2. Verificação
SELECT 
    'VERIFICAÇÃO' as tipo,
    sf.id,
    sf.name,
    sf.category_id,
    sc.name as categoria,
    sc.slug as categoria_slug
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
WHERE sf.id = 57 OR sf.slug = 'receitas-destaques';

