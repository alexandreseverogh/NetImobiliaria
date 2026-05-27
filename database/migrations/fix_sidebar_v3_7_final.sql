-- HARMONIZAÇÃO SIDEBAR MASTER v3.7
-- Resolve conflitos de colunas e restaura estrutura visual de sidebar_menu_items

-- 1. Limpeza de conflitos
DROP FUNCTION IF EXISTS public.get_sidebar_menu_for_user(uuid, text, uuid);

-- 2. Recriação com Lógica de Governança + Estrutura Visual
CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(
    p_user_id UUID, 
    p_system_id TEXT, 
    p_tenant_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_role_level INTEGER;
    v_is_super_adm BOOLEAN;
    v_menu JSONB;
BEGIN
    -- [1] Identificar Poder do Usuário
    SELECT ur.level INTO v_role_level
    FROM user_tenant_membership utm
    JOIN user_roles ur ON utm.role_id = ur.id
    WHERE utm.user_id = p_user_id AND utm.tenant_id = p_tenant_id AND utm.is_active = true
    ORDER BY ur.level DESC LIMIT 1;

    -- Fallback Master
    IF v_role_level IS NULL THEN
        SELECT ur.level INTO v_role_level
        FROM user_role_assignments ura
        JOIN user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = p_user_id
        ORDER BY ur.level DESC LIMIT 1;
    END IF;

    v_is_super_adm := (COALESCE(v_role_level, 0) >= 6);

    -- [2] Construir Menu Filtrado por Governança (Relacional)
    WITH menu_governance AS (
        SELECT 
            smi.id,
            smi.parent_id,
            smi.name,
            smi.icon_name,
            smi.url,
            smi.order_index,
            smi.system_id,
            smi.permission_required,
            -- Prioridade 1: Override | Prioridade 2: Blueprint | Default: Inativo se exigir permissão
            COALESCE(
                ovr.is_active, 
                blu.is_active, 
                CASE WHEN smi.permission_required IS NULL THEN true ELSE false END
            ) as is_granted
        FROM public.sidebar_menu_items smi
        -- Link com a Governança via Slug de Funcionalidade
        LEFT JOIN public.system_features feat ON smi.permission_required = feat.slug
        -- Overrides para esta empresa
        LEFT JOIN public.tenant_feature_overrides ovr ON feat.id = ovr.feature_id AND ovr.tenant_id = p_tenant_id
        -- Blueprints do Segmento da empresa
        LEFT JOIN public.tenants t ON t.id = p_tenant_id
        LEFT JOIN public.system_segment_blueprints blu ON feat.id = blu.feature_id AND blu.segment_id = t.segment_id
        
        WHERE smi.is_active = true
        AND (smi.system_id = p_system_id OR (smi.system_id IS NULL AND p_system_id = 'admin'))
    )
    SELECT jsonb_agg(menu_data) INTO v_menu
    FROM (
        SELECT 
            id, parent_id, name, url, icon_name as icon, order_index
        FROM menu_governance
        WHERE (v_is_super_adm = true OR is_granted = true)
        ORDER BY parent_id NULLS FIRST, order_index ASC
    ) menu_data;

    RETURN COALESCE(v_menu, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
