CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid, p_system_id text, p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _v_is_superadm BOOLEAN := false;
    _res JSONB;
BEGIN
    -- 1. Verificação de Super Admin (Master)
    SELECT EXISTS (
        SELECT 1 FROM public.user_role_assignments ura
        JOIN public.user_roles r ON ura.role_id = r.id
        WHERE ura.user_id = p_user_id 
          AND r.is_system_role = true
    ) OR EXISTS (
        SELECT 1 FROM public.user_tenant_membership utm
        JOIN public.user_roles r ON utm.role_id = r.id
        WHERE utm.user_id = p_user_id 
          AND r.is_system_role = true
    ) INTO _v_is_superadm;

    -- 2. CTE para buscar itens permitidos
    WITH allowed_items AS (
        SELECT 
            s.id,
            s.parent_id,
            s.name,
            s.icon_name as icon,
            s.url as path,
            s.order_index,
            s.system_id,
            s.permission_required
        FROM public.sidebar_menu_items s
        WHERE s.is_active = true
          AND (
            -- MASTER visualiza TUDO de todos os sistemas
            _v_is_superadm = true
            -- Outros usuários visualizam apenas o sistema atual
            OR s.system_id = p_system_id 
            OR (s.system_id IS NULL AND p_system_id = 'admin')
          )
          -- [ENTITLEMENT CHECK]
          AND (
            _v_is_superadm = true
            OR p_tenant_id IS NULL 
            OR s.feature_id IS NULL 
            OR EXISTS (
                SELECT 1 
                FROM public.system_feature_modules sfm
                JOIN public.tenant_modules tm ON sfm.module_id = tm.module_id
                WHERE sfm.feature_id = s.feature_id 
                  AND tm.tenant_id = p_tenant_id 
                  AND tm.is_enabled = true
            )
          )
          -- [PERMISSION CHECK]
          AND (
            _v_is_superadm = true
            OR s.permission_required IS NULL 
            OR s.permission_required = ''
            OR EXISTS (
                SELECT 1 FROM public.tenant_feature_overrides o 
                JOIN public.system_features f ON o.feature_id = f.id
                WHERE o.tenant_id = p_tenant_id 
                  AND f.slug = s.permission_required AND o.is_active = true
            )
            OR EXISTS (
                SELECT 1 FROM public.system_segment_blueprints b
                JOIN public.tenants t ON b.segment_id = t.segment_id
                JOIN public.system_features f ON b.feature_id = f.id
                WHERE t.id = p_tenant_id AND f.slug = s.permission_required
                  AND b.is_required = true
            )
          )
    )
    SELECT jsonb_agg(items) INTO _res
    FROM (
        SELECT * FROM allowed_items
        ORDER BY parent_id NULLS FIRST, order_index ASC
    ) items;

    RETURN COALESCE(_res, '[]'::jsonb);
END;
$function$;
