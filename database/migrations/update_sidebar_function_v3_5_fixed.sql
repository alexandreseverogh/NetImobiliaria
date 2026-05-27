CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id UUID, p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_role_level INTEGER;
    v_menu JSONB;
BEGIN
    -- 1. Obter nível de acesso do usuário neste tenant (via membership)
    SELECT ur.level INTO v_role_level
    FROM user_tenant_membership utm
    JOIN user_roles ur ON utm.role_id = ur.id
    WHERE utm.user_id = p_user_id AND utm.tenant_id = p_tenant_id AND utm.is_active = true
    ORDER BY ur.level DESC LIMIT 1;

    -- Fallback para roles globais caso não haja membership específico (ex: Super Admin Master)
    IF v_role_level IS NULL THEN
        SELECT ur.level INTO v_role_level
        FROM user_role_assignments ura
        JOIN user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = p_user_id
        ORDER BY ur.level DESC LIMIT 1;
    END IF;

    -- 2. Construir o menu baseado em Permissões + Blueprints do Segmento + Overrides do Tenant
    WITH feature_access AS (
        SELECT 
            f.id, f.name, f.slug, f.category_id,
            COALESCE(o.is_active, b.is_active, false) as current_status
        FROM system_features f
        JOIN tenants t ON t.id = p_tenant_id
        LEFT JOIN system_segment_blueprints b ON f.id = b.feature_id AND b.segment_id = t.segment_id
        LEFT JOIN tenant_feature_overrides o ON f.id = o.feature_id AND o.tenant_id = t.id
        WHERE v_role_level >= f.min_role_level
    )
    SELECT jsonb_agg(cat_menu) INTO v_menu
    FROM (
        SELECT 
            jsonb_build_object(
                'category', c.name,
                'icon', c.icon,
                'items', jsonb_agg(
                    jsonb_build_object(
                        'name', f.name,
                        'slug', f.slug
                    )
                )
            ) as cat_menu
        FROM system_categorias c
        JOIN feature_access f ON f.category_id = c.id
        WHERE f.current_status = true
        GROUP BY c.id, c.name, c.icon
        ORDER BY c.id
    ) sub;

    RETURN COALESCE(v_menu, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
