CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid, p_system_id text DEFAULT 'admin'::text, p_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_is_master BOOLEAN;
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

    -- 2. CTE de Funcionalidades Permitidas e Provisionadas
    WITH permitted_features AS (
        SELECT DISTINCT sf.*
        FROM public.system_features sf
        WHERE sf.is_active = true
          -- FILTRO A: PERMISSÃO DO PERFIL (O que o usuário pode fazer)
          AND (
            v_is_master = true OR
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
          -- FILTRO B: PROVISÃO DA EMPRESA (O que a empresa tem direito)
          AND (
            v_is_master = true OR
            p_tenant_id IS NULL OR
            EXISTS (
                SELECT 1 FROM public.tenant_feature_overrides tfo
                WHERE tfo.feature_id = sf.id AND tfo.tenant_id = p_tenant_id AND tfo.is_active = true
            )
          )
    ),
    -- 3. Mapeamento de Funcionalidades para Categorias (Suporta Multi-Categoria)
    feature_to_category AS (
        -- Usar mapeamento explícito se existir
        SELECT pf.id as feature_id, sfc.category_id
        FROM permitted_features pf
        JOIN public.system_feature_categorias sfc ON pf.id = sfc.feature_id
        UNION
        -- Usar categoria padrão da feature se não estiver no mapeamento explícito
        SELECT pf.id as feature_id, pf.category_id
        FROM permitted_features pf
        WHERE pf.category_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.system_feature_categorias sfc WHERE sfc.feature_id = pf.id)
    ),
    -- 4. Construção da Estrutura de Categorias
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
          -- Filtro de Provisionamento do Módulo da Categoria
          AND (
            v_is_master = true OR
            sc.module_id IS NULL OR
            EXISTS (SELECT 1 FROM public.tenant_modules tm WHERE tm.module_id = sc.module_id AND tm.tenant_id = p_tenant_id AND tm.is_enabled = true)
          )
        GROUP BY sc.id, sc.name, sc.icon, sc.sort_order
    )
    -- 5. Agregação Final do Menu
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
$function$;
