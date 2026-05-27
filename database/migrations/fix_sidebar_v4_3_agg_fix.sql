-- SIDEBAR MASTER v4.3 - FIX DO jsonb_agg com ORDER BY correto
DROP FUNCTION IF EXISTS public.get_sidebar_menu_for_user(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(
    p_user_id UUID, 
    p_system_id TEXT, 
    p_tenant_id UUID
)
RETURNS JSONB AS $$
DECLARE
    _v_role_level   INTEGER;
    _v_is_superadm  BOOLEAN;
    _v_segment_id   UUID;
    _v_menu_output  JSONB;
BEGIN
    -- [1] Nível de acesso via membership
    SELECT ur.level INTO _v_role_level
    FROM public.user_tenant_membership utm
    JOIN public.user_roles ur ON utm.role_id = ur.id
    WHERE utm.user_id = p_user_id
      AND utm.tenant_id = p_tenant_id
      AND utm.is_active = true
    ORDER BY ur.level DESC LIMIT 1;

    -- Fallback: roles globais
    IF _v_role_level IS NULL THEN
        SELECT ur.level INTO _v_role_level
        FROM public.user_role_assignments ura
        JOIN public.user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = p_user_id
        ORDER BY ur.level DESC LIMIT 1;
    END IF;

    _v_is_superadm := (COALESCE(_v_role_level, 0) >= 6);

    -- [2] Segmento da empresa
    SELECT segment_id INTO _v_segment_id
    FROM public.tenants WHERE id = p_tenant_id;

    -- [3] Construção do menu com ORDER BY separado para evitar bug do jsonb_agg
    WITH _permissions AS (
        SELECT
            f.slug AS feat_slug,
            COALESCE(
                (SELECT o.is_active
                 FROM public.tenant_feature_overrides o
                 WHERE o.feature_id = f.id AND o.tenant_id = p_tenant_id
                 LIMIT 1),
                (SELECT b.is_required
                 FROM public.system_segment_blueprints b
                 WHERE b.feature_id = f.id AND b.segment_id = _v_segment_id
                 LIMIT 1),
                false
            ) AS granted
        FROM public.system_features f
    )
    SELECT jsonb_agg(row_data)
    INTO _v_menu_output
    FROM (
        SELECT jsonb_build_object(
            'id',                  s.id,
            'parent_id',           s.parent_id,
            'name',                s.name,
            'path',                s.url,
            'icon',                s.icon_name,
            'order_index',         s.order_index,
            'system_id',           s.system_id,
            'is_active',           s.is_active,
            'permission_required', s.permission_required
        ) AS row_data,
        s.parent_id AS sort_pid,
        s.order_index AS sort_idx
        FROM public.sidebar_menu_items s
        WHERE s.is_active = true
          AND (s.system_id = p_system_id
               OR (s.system_id IS NULL AND p_system_id = 'admin'))
          AND (
            _v_is_superadm = true
            OR s.permission_required IS NULL
            OR EXISTS (
                SELECT 1 FROM _permissions p 
                WHERE p.feat_slug = s.permission_required AND p.granted = true
            )
          )
        ORDER BY s.parent_id NULLS FIRST, s.order_index ASC
    ) ordered_items;

    RETURN COALESCE(_v_menu_output, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
