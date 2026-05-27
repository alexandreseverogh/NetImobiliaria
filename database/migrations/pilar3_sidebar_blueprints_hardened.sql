CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(
    p_user_id UUID,
    p_system_id TEXT DEFAULT 'admin',
    p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    parent_id INTEGER,
    name TEXT,
    icon TEXT,
    path TEXT,
    sort_order INTEGER,
    system_id TEXT,
    is_active BOOLEAN,
    permission_required TEXT,
    roles_required JSONB,
    badge_count INTEGER,
    is_expanded BOOLEAN
) AS $func$
DECLARE
    v_segment_name TEXT;
BEGIN
    -- 1. Identificar o segmento do Tenant (se fornecido)
    IF p_tenant_id IS NOT NULL THEN
        SELECT t.segment::TEXT INTO v_segment_name 
        FROM public.tenants t 
        WHERE t.id = p_tenant_id;
    END IF;

    RETURN QUERY
    WITH user_roles AS (
        SELECT ura.role_id 
        FROM public.user_role_assignments ura 
        WHERE ura.user_id = p_user_id
    ),
    allowed_features AS (
        SELECT sf.slug::TEXT as slug 
        FROM public.system_segment_blueprints ssb
        JOIN public.system_features sf ON ssb.feature_id = sf.id
        WHERE ssb.segment = v_segment_name OR v_segment_name IS NULL
    )
    SELECT 
        smi.id::INTEGER,
        smi.parent_id::INTEGER,
        smi.name::TEXT,
        smi.icon_name::TEXT as icon,
        smi.url::TEXT as path,
        smi.order_index::INTEGER as sort_order,
        smi.system_id::TEXT,
        smi.is_active::BOOLEAN,
        smi.permission_required::TEXT,
        (
            SELECT jsonb_agg(sir.role_id)
            FROM public.sidebar_item_roles sir
            WHERE sir.sidebar_item_id = smi.id
        )::JSONB as roles_required,
        0::INTEGER as badge_count,
        false::BOOLEAN as is_expanded
    FROM 
        public.sidebar_menu_items smi
    WHERE 
        smi.is_active = true
        AND (smi.system_id = p_system_id OR smi.system_id IS NULL)
        
        -- FILTRO DE BLUEPRINT:
        AND (
            smi.permission_required IS NULL 
            OR p_tenant_id IS NULL
            OR smi.permission_required::TEXT IN (SELECT af.slug FROM allowed_features af)
        )

        -- FILTRO DE ACESSO:
        AND (
            NOT EXISTS (SELECT 1 FROM public.sidebar_item_roles sir_check WHERE sir_check.sidebar_item_id = smi.id)
            OR 
            EXISTS (
                SELECT 1 FROM public.sidebar_item_roles sir 
                JOIN user_roles ur ON sir.role_id = ur.role_id 
                WHERE sir.sidebar_item_id = smi.id
            )
        )
    ORDER BY 
        smi.parent_id NULLS FIRST, 
        smi.order_index;
END;
$func$ LANGUAGE plpgsql;
