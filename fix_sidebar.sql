CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(
    p_user_id uuid,
    p_system_id character varying DEFAULT 'admin'::character varying,
    p_tenant_id uuid DEFAULT NULL::uuid
) RETURNS jsonb
    LANGUAGE plpgsql
AS $$
DECLARE
    v_is_master BOOLEAN := false;
    v_is_tenant_admin BOOLEAN := false;
    v_menu JSONB;
BEGIN
    -- 1. Identificar se o usuário é Master Admin (Acesso Global)
    SELECT EXISTS (
        SELECT 1 FROM public.user_role_assignments ura
        JOIN public.user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = p_user_id AND ur.is_system_role = true
        UNION
        SELECT 1 FROM public.user_tenant_membership utm
        JOIN public.user_roles ur ON utm.role_id = ur.id
        WHERE utm.user_id = p_user_id AND ur.is_system_role = true
    ) INTO v_is_master;

    -- 1b. Identificar se o usuário é Admin do Tenant
    IF p_tenant_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.user_tenant_membership utm
            JOIN public.user_roles ur ON utm.role_id = ur.id
            WHERE utm.user_id = p_user_id 
              AND utm.tenant_id = p_tenant_id 
              AND (ur.name ILIKE '%admin%')
        ) INTO v_is_tenant_admin;
    END IF;

    -- 2. CTE de Funcionalidades Permitidas e Provisionadas
    WITH permitted_features AS (
        SELECT DISTINCT sf.*
        FROM public.system_features sf
        WHERE sf.is_active = true
          -- FILTRO A: PERMISSÃO DO PERFIL OU ADMIN
          AND (
            v_is_master = true OR
            v_is_tenant_admin = true OR
            EXISTS (
                SELECT 1 FROM public.permissions p
                JOIN public.role_permissions rp ON rp.permission_id = p.id
                JOIN (
                    SELECT role_id FROM public.user_role_assignments WHERE user_id = p_user_id
                    UNION
                    SELECT role_id FROM public.user_tenant_membership WHERE user_id = p_user_id AND (tenant_id = p_tenant_id OR p_tenant_id IS NULL)
                ) uar ON uar.role_id = rp.role_id
                WHERE p.feature_id = sf.id
                  AND (LOWER(p.action) IN ('read', 'view', 'execute', 'visualizar', 'acessar'))
            )
          )
          -- FILTRO B: PROVISÃO DA EMPRESA
          AND (
            v_is_master = true OR
            p_tenant_id IS NULL OR
            -- A feature pertence a uma categoria cujo módulo está provisionado para a empresa
            EXISTS (
                SELECT 1 FROM public.system_categorias sc
                JOIN public.tenant_modules tm ON tm.module_id = sc.module_id
                WHERE sc.id = sf.category_id 
                  AND tm.tenant_id = p_tenant_id 
                  AND tm.is_enabled = true
            ) OR
            -- Ou a feature foi explicitamente provisionada como exceção
            EXISTS (
                SELECT 1 FROM public.tenant_feature_overrides tfo
                WHERE tfo.feature_id = sf.id AND tfo.tenant_id = p_tenant_id AND tfo.is_active = true
            )
          )
    ),
    -- 3. Mapeamento Robusto de Funcionalidades para Categorias
    feature_to_category AS (
        -- Prioridade 1: Mapeamento explícito
        SELECT pf.id as feature_id, sfc.category_id
        FROM permitted_features pf
        JOIN public.system_feature_categorias sfc ON pf.id = sfc.feature_id
        JOIN public.system_categorias sc ON sfc.category_id = sc.id
        WHERE sc.is_active = true
        UNION
        -- Prioridade 2: Categoria padrão
        SELECT pf.id as feature_id, pf.category_id
        FROM permitted_features pf
        JOIN public.system_categorias sc ON pf.category_id = sc.id
        WHERE sc.is_active = true
          AND NOT EXISTS (
              SELECT 1 FROM public.system_feature_categorias sfc 
              JOIN public.system_categorias sc2 ON sfc.category_id = sc2.id
              WHERE sfc.feature_id = pf.id AND sc2.is_active = true
          )
    ),
    -- 4. Construção da Estrutura
    category_structure AS (
        SELECT
            sc.id as category_id,
            sc.name as category_name,
            sc.icon as category_icon,
            COALESCE(sc.sort_order, 0) as category_order,
            jsonb_agg(
                jsonb_build_object(
                    'id', pf.id,
                    'name', pf.name,
                    'path', pf.url,
                    'icon', COALESCE(pf.icon, 'default')
                ) ORDER BY COALESCE(pf.sort_order, 0), pf.name
            ) as children
        FROM public.system_categorias sc
        JOIN feature_to_category ftc ON ftc.category_id = sc.id
        JOIN permitted_features pf ON pf.id = ftc.feature_id
        WHERE sc.is_active = true
          AND (
            v_is_master = true OR
            sc.module_id IS NULL OR
            EXISTS (SELECT 1 FROM public.tenant_modules tm WHERE tm.module_id = sc.module_id AND tm.tenant_id = p_tenant_id AND tm.is_enabled = true) OR
            -- Permitir categoria se a feature específica foi explicitamente provisionada
            EXISTS (SELECT 1 FROM public.tenant_feature_overrides tfo WHERE tfo.feature_id = pf.id AND tfo.tenant_id = p_tenant_id AND tfo.is_active = true)
          )
        GROUP BY sc.id, sc.name, sc.icon, sc.sort_order
    )
    -- 5. Agregação Final
    SELECT
        jsonb_agg(
            jsonb_build_object(
                'id', category_id,
                'name', category_name,
                'icon', category_icon,
                'children', children
            ) ORDER BY category_order, category_name
        )
    INTO v_menu
    FROM category_structure;

    RETURN COALESCE(v_menu, '[]'::jsonb);
END;
$$;
