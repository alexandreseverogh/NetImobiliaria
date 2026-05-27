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
    v_is_super_admin BOOLEAN := false;
BEGIN
    -- 1. Verificar se o usuário é Super Admin (ID de papel 1)
    SELECT EXISTS (
        SELECT 1 FROM public.user_role_assignments 
        WHERE user_id = p_user_id AND role_id = 1
    ) INTO v_is_super_admin;

    -- 2. Identificar o segmento do Tenant
    IF p_tenant_id IS NOT NULL THEN
        SELECT t.segment::TEXT INTO v_segment_name 
        FROM public.tenants t 
        WHERE t.id = p_tenant_id;
    END IF;

    -- 3. Retorno com Bypass para Super Admin
    RETURN QUERY 
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
        
        -- FILTRO DE BLUEPRINT (COM BYPASS MASTER):
        AND (
            v_is_super_admin = true             -- Super Admin vê tudo
            OR smi.permission_required IS NULL  -- Itens sem permissão requerida são globais
            OR p_tenant_id IS NULL              -- Contexto sem empresa (Master) vê tudo
            OR EXISTS (                         -- Caso contrário, verifica o blueprint do segmento
                SELECT 1 
                FROM public.system_segment_blueprints ssb
                JOIN public.system_features sf ON ssb.feature_id = sf.id
                WHERE (ssb.segment = v_segment_name OR v_segment_name IS NULL)
                  AND sf.slug = smi.permission_required
            )
        )

        -- FILTRO DE ACESSO (PERMISSÕES POR ROLE):
        AND (
            v_is_super_admin = true -- Super Admin ignora travas de role
            OR NOT EXISTS (SELECT 1 FROM public.sidebar_item_roles sir_check WHERE sir_check.sidebar_item_id = smi.id)
            OR EXISTS (
                SELECT 1 FROM public.sidebar_item_roles sir
                JOIN public.user_role_assignments ura ON sir.role_id = ura.role_id
                WHERE sir.sidebar_item_id = smi.id AND ura.user_id = p_user_id
            )
        )
    ORDER BY 
        smi.parent_id NULLS FIRST, 
        smi.order_index;
END;
$func$ LANGUAGE plpgsql;
