-- SIDEBAR MASTER v3.9.1 (GOLD FIX)
-- Corrigindo variáveis e isolando lógica para restauração definitiva do menu

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
    _v_menu_data JSONB;
BEGIN
    -- [1] Capturar Contexto do Usuário e Empresa
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

    SELECT segment_id INTO _v_segment_id FROM public.tenants WHERE id = p_tenant_id;

    -- [2] Construção do Menu Sanitizada
    WITH _filtered_items AS (
        SELECT 
            s.id, s.parent_id, s.name, s.url, s.icon_name, s.order_index,
            (
                CASE 
                    WHEN _v_is_super_adm = true THEN true
                    WHEN s.permission_required IS NULL THEN true
                    ELSE (
                        COALESCE(
                            (SELECT o.is_active FROM public.tenant_feature_overrides o 
                             JOIN public.system_features f ON o.feature_id = f.id 
                             WHERE o.tenant_id = p_tenant_id AND f.slug = s.permission_required LIMIT 1),
                            
                            (SELECT b.is_active FROM public.system_segment_blueprints b 
                             JOIN public.system_features f ON b.feature_id = f.id 
                             WHERE b.segment_id = _v_segment_id AND f.slug = s.permission_required LIMIT 1),
                            
                            false
                        )
                    )
                END
            ) as _has_access
        FROM public.sidebar_menu_items s
        WHERE s.is_active = true
        AND (s.system_id = p_system_id OR (s.system_id IS NULL AND p_system_id = 'admin'))
    )
    SELECT jsonb_agg(_m) INTO _v_menu_data
    FROM (
        SELECT 
            id, parent_id, name, url, icon_name as icon, order_index
        FROM _filtered_items
        WHERE _has_access = true
        ORDER BY parent_id NULLS FIRST, order_index ASC
    ) _m;

    RETURN COALESCE(_v_menu_data, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
