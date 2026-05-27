-- SIDEBAR MASTER v4.1 - CORREÇÃO DEFINITIVA
-- Usa 'is_required' em system_segment_blueprints (não 'is_active')

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

    -- [3] Construção do menu
    WITH _permissions AS (
        -- Pré-calcula permissão de cada feature para este tenant/segmento
        SELECT
            f.slug                                                    AS feat_slug,
            -- Override explícito tem prioridade absoluta
            COALESCE(
                (SELECT o.is_active
                 FROM public.tenant_feature_overrides o
                 WHERE o.feature_id = f.id AND o.tenant_id = p_tenant_id
                 LIMIT 1),
                -- Sem override: segue blueprint do segmento (is_required = true significa habilitado)
                (SELECT b.is_required
                 FROM public.system_segment_blueprints b
                 WHERE b.feature_id = f.id AND b.segment_id = _v_segment_id
                 LIMIT 1),
                false
            )                                                         AS granted
        FROM public.system_features f
    ),
    _visible_items AS (
        SELECT
            s.id, s.parent_id, s.name, s.url,
            s.icon_name, s.order_index,
            CASE
                WHEN _v_is_superadm                          THEN true
                WHEN s.permission_required IS NULL            THEN true
                ELSE COALESCE(
                    (SELECT p.granted FROM _permissions p WHERE p.feat_slug = s.permission_required),
                    false
                )
            END AS has_access
        FROM public.sidebar_menu_items s
        WHERE s.is_active = true
          AND (s.system_id = p_system_id
               OR (s.system_id IS NULL AND p_system_id = 'admin'))
    )
    SELECT jsonb_agg(row_item ORDER BY parent_id NULLS FIRST, order_index)
    INTO _v_menu_output
    FROM (
        SELECT id, parent_id, name, url, icon_name AS icon, order_index
        FROM _visible_items
        WHERE has_access = true
    ) row_item;

    RETURN COALESCE(_v_menu_output, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
