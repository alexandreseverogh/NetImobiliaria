CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id integer, p_tenant_id uuid, p_system_id character varying DEFAULT 'admin'::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _v_role_level INTEGER;
    _v_is_superadm BOOLEAN;
    _res JSONB;
BEGIN
    -- 1. Obter n├â┬¡vel da role do usu├â┬írio
    SELECT r.level, r.level >= 6 INTO _v_role_level, _v_is_superadm
    FROM public.user_tenant_membership utm
    JOIN public.user_roles r ON utm.role_id = r.id
    WHERE utm.user_id = p_user_id AND utm.tenant_id = p_tenant_id;

    -- 2. Selecionar itens permitidos
    WITH allowed_items AS (
        SELECT 
            s.*
        FROM public.sidebar_menu_items s
        WHERE s.is_active = true
          AND (
            s.system_id = p_system_id 
            OR (s.system_id IS NULL AND p_system_id = 'admin')
          )
          -- Entitlement Check:
          AND (
            _v_is_superadm = true
            OR p_tenant_id IS NULL 
            OR s.feature_id IS NULL 
            OR EXISTS (
                -- VERIFICA├âÔÇí├âãÆO MULTI-M├âÔÇ£DULO: SE QUALQUER M├âÔÇ£DULO HABILITADOR ESTIVER ATIVO
                SELECT 1 
                FROM public.system_feature_modules sfm
                JOIN public.tenant_modules tm ON sfm.module_id = tm.module_id
                WHERE sfm.feature_id = s.feature_id 
                  AND tm.tenant_id = p_tenant_id 
                  AND tm.is_enabled = true
            )
          )
          -- Permissions Check:
          AND (
            _v_is_superadm = true
            OR s.permission_required IS NULL 
            OR s.permission_required = ''
            OR EXISTS (
                -- Tenant Override take priority
                SELECT 1 FROM public.tenant_feature_overrides o 
                JOIN public.system_features f ON o.feature_id = f.id
                WHERE o.tenant_id = p_tenant_id AND o.user_id = p_user_id
                  AND f.slug = s.permission_required AND o.is_active = true
            )
            OR EXISTS (
                -- Blueprints
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
        SELECT * FROM (
            SELECT DISTINCT ON (id) * FROM allowed_items
        ) final_items
        ORDER BY order_index ASC
    ) items;

    RETURN COALESCE(_res, '[]'::jsonb);
END;
$function$

