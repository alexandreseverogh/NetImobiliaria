-- SIDEBAR MASTER v3.8 (ULTRA-HARDENING)
-- Resolve ambiguidades complexas de colunas is_active em cenários multitenant

DROP FUNCTION IF EXISTS public.get_sidebar_menu_for_user(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(
    p_user_id UUID, 
    p_system_id TEXT, 
    p_tenant_id UUID
)
RETURNS JSONB AS $$
DECLARE
    _role_level INTEGER;
    _is_super_adm BOOLEAN;
    _menu_json JSONB;
BEGIN
    -- [1] Identificar Nível de Acesso (Dando upgrade na segurança da busca)
    SELECT _roles.level INTO _role_level
    FROM public.user_tenant_membership _membership
    JOIN public.user_roles _roles ON _membership.role_id = _roles.id
    WHERE _membership.user_id = p_user_id 
      AND _membership.tenant_id = p_tenant_id 
      AND _membership.is_active = true
    ORDER BY _roles.level DESC LIMIT 1;

    -- Fallback Master (Roles Globais)
    IF _role_level IS NULL THEN
        SELECT _roles_g.level INTO _role_level
        FROM public.user_role_assignments _assign
        JOIN public.user_roles _roles_g ON _assign.role_id = _roles_g.id
        WHERE _assign.user_id = p_user_id
        ORDER BY _roles_g.level DESC LIMIT 1;
    END IF;

    _is_super_adm := (COALESCE(_role_level, 0) >= 6);

    -- [2] Construção do Menu com Aliases Únicos para evitar ambiguidade is_active
    WITH _governance_cte AS (
        SELECT 
            _s.id as _item_id,
            _s.parent_id as _item_parent_id,
            _s.name as _item_name,
            _s.icon_name as _item_icon,
            _s.url as _item_url,
            _s.order_index as _item_order,
            _s.system_id as _item_system,
            -- Lógica de Concessão de Acesso (Prioridade: Override > Blueprint > Default)
            COALESCE(
                _o.is_active, 
                _b.is_active, 
                CASE WHEN _s.permission_required IS NULL THEN true ELSE false END
            ) as _granted_access
        FROM public.sidebar_menu_items _s
        -- Junções com Prefixo Único
        LEFT JOIN public.system_features _f ON _s.permission_required = _f.slug
        LEFT JOIN public.tenant_feature_overrides _o ON _f.id = _o.feature_id AND _o.tenant_id = p_tenant_id
        LEFT JOIN public.tenants _t ON _t.id = p_tenant_id
        LEFT JOIN public.system_segment_blueprints _b ON _f.id = _b.feature_id AND _b.segment_id = _t.segment_id
        
        WHERE _s.is_active = true
        AND (_s.system_id = p_system_id OR (_s.system_id IS NULL AND p_system_id = 'admin'))
    )
    SELECT jsonb_agg(_row) INTO _menu_json
    FROM (
        SELECT 
            _item_id as id, 
            _item_parent_id as parent_id, 
            _item_name as name, 
            _item_url as url, 
            _item_icon as icon, 
            _item_order as order_index
        FROM _governance_cte
        WHERE (_is_super_adm = true OR _granted_access = true)
        ORDER BY _item_parent_id NULLS FIRST, _item_order ASC
    ) _row;

    RETURN COALESCE(_menu_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
