-- SIDEBAR MASTER v4.0 (PERMISSION MAP ARCHITECTURE)
-- Elimina ambiguidades movendo a lógica de governança para uma camada isolada de pré-processamento

DROP FUNCTION IF EXISTS public.get_sidebar_menu_for_user(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(
    p_user_id UUID, 
    p_system_id TEXT, 
    p_tenant_id UUID
)
RETURNS JSONB AS $$
DECLARE
    _v_role_level INTEGER;
    _v_is_super_adm BOOLEAN;
    _v_segment_id UUID;
    _v_menu_output JSONB;
BEGIN
    -- [1] Identificar Poder do Usuário
    SELECT ur.level INTO _v_role_level
    FROM public.user_tenant_membership utm
    JOIN public.user_roles ur ON utm.role_id = ur.id
    WHERE utm.user_id = p_user_id AND utm.tenant_id = p_tenant_id AND utm.is_active = true
    ORDER BY ur.level DESC LIMIT 1;

    IF _v_role_level IS NULL THEN
        SELECT ur.level INTO _v_role_level
        FROM public.user_role_assignments ura
        JOIN public.user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = p_user_id
        ORDER BY ur.level DESC LIMIT 1;
    END IF;

    _v_is_super_adm := (COALESCE(_v_role_level, 0) >= 6);

    -- [2] Obter ID do Segmento
    SELECT segment_id INTO _v_segment_id FROM public.tenants WHERE id = p_tenant_id;

    -- [3] Construir Mapa de Permissões Resolvido (CTE Isolado)
    WITH _resolved_governance AS (
        SELECT 
            f.slug as feat_slug,
            -- Lógica de Prioridade: Override > Blueprint > Default (False)
            COALESCE(
                (SELECT o.is_active FROM public.tenant_feature_overrides o WHERE o.feature_id = f.id AND o.tenant_id = p_tenant_id LIMIT 1),
                (SELECT b.is_active FROM public.system_segment_blueprints b WHERE b.feature_id = f.id AND b.segment_id = _v_segment_id LIMIT 1),
                false
            ) as is_granted
        FROM public.system_features f
    ),
    _menu_final AS (
        SELECT 
            s.id, s.parent_id, s.name, s.url, s.icon_name, s.order_index,
            (
                CASE 
                    WHEN _v_is_super_adm = true THEN true
                    WHEN s.permission_required IS NULL THEN true
                    ELSE COALESCE((SELECT is_granted FROM _resolved_governance WHERE feat_slug = s.permission_required), false)
                END
            ) as has_access
        FROM public.sidebar_menu_items s
        -- Usando o campo is_active da sidebar com prefixo absoluto 
        WHERE s.is_active = true 
        AND (s.system_id = p_system_id OR (s.system_id IS NULL AND p_system_id = 'admin'))
    )
    SELECT jsonb_agg(_row) INTO _v_menu_output
    FROM (
        SELECT 
            id, parent_id, name, url, icon_name as icon, order_index
        FROM _menu_final
        WHERE has_access = true
        ORDER BY parent_id NULLS FIRST, order_index ASC
    ) _row;

    RETURN COALESCE(_v_menu_output, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
