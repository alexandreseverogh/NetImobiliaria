-- ============================================================
-- CIRURGIA DE SIDEBAR: ÍCONES CERTIFICADOS (V14)
-- ============================================================

-- Usando apenas chaves que existem no iconMap do DynamicIcon.tsx
UPDATE public.system_features SET icon = 'wrench' WHERE slug = 'field-builder';
UPDATE public.system_features SET icon = 'chartbaricon' WHERE slug = 'crm-roi-dashboard';
UPDATE public.system_features SET icon = 'buildingofficeicon' WHERE slug = 'gestao-unidades';
UPDATE public.system_features SET icon = 'squares' WHERE slug = 'master-modules';
UPDATE public.system_features SET icon = 'shieldcheckicon' WHERE slug = 'master-provisioning-hub';
UPDATE public.system_features SET icon = 'documenttexticon' WHERE slug = 'master-global-audit';
UPDATE public.system_features SET icon = 'cog' WHERE slug = 'brainstorming-sync';
UPDATE public.system_features SET icon = 'viewcolumnsicon' WHERE slug = 'crm-kanban-setup';
UPDATE public.system_features SET icon = 'usergroupicon' WHERE slug = 'master-user-audit';
UPDATE public.system_features SET icon = 'tagicon' WHERE slug = 'master-segments';
UPDATE public.system_features SET icon = 'wrenchscrewdrivericon' WHERE slug = 'master-field-builder';
UPDATE public.system_features SET icon = 'adjustmentshorizontalicon' WHERE slug = 'crm-settings';

-- Garantir que a função SQL continue estável
CREATE OR REPLACE FUNCTION get_sidebar_menu_for_user(
    p_user_id UUID, 
    p_system_id TEXT DEFAULT 'admin', 
    p_tenant_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_master BOOLEAN;
    v_menu JSONB;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.user_role_assignments ura
        JOIN public.user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = p_user_id AND ur.is_system_role = true
        UNION
        SELECT 1 FROM public.user_tenant_membership utm
        JOIN public.user_roles ur ON utm.role_id = ur.id
        WHERE utm.user_id = p_user_id AND ur.is_system_role = true
    ) INTO v_is_master;

    WITH permitted_features AS (
        SELECT DISTINCT
            sf.id,
            sf.name,
            sf.url,
            sf.category_id,
            sf.icon,
            COALESCE(sf.sort_order, 0) as feature_order
        FROM public.system_features sf
        WHERE sf.is_active = true
          AND (
            v_is_master = true OR 
            EXISTS (
                SELECT 1 FROM public.permissions p
                JOIN public.role_permissions rp ON rp.permission_id = p.id
                JOIN (
                    SELECT role_id FROM public.user_role_assignments WHERE user_id = p_user_id
                    UNION
                    SELECT role_id FROM public.user_tenant_membership WHERE user_id = p_user_id AND (tenant_id = p_tenant_id OR p_tenant_id IS NULL)
                ) uar ON uar.role_id = rp.role_id
                WHERE p.feature_id = sf.id
                  AND (LOWER(p.action) IN ('read', 'view', 'execute', 'visualizar', 'acessar'))
            )
          )
          AND (
            v_is_master = true OR 
            p_tenant_id IS NULL OR 
            EXISTS (
                SELECT 1 FROM public.system_feature_modules fm
                JOIN public.tenant_modules tm ON fm.module_id = tm.module_id
                WHERE fm.feature_id = sf.id AND tm.tenant_id = p_tenant_id AND tm.is_enabled = true
            ) OR
            NOT EXISTS (SELECT 1 FROM public.system_feature_modules fm WHERE fm.feature_id = sf.id)
          )
    ),
    category_structure AS (
        SELECT 
            sc.id as category_id,
            sc.name as category_name,
            sc.icon as category_icon,
            COALESCE(sc.sort_order, 0) as category_order,
            jsonb_agg(
                jsonb_build_object(
                    'id', 'feat_' || pf.id::text,
                    'name', pf.name,
                    'path', pf.url,
                    'icon', COALESCE(pf.icon, 'default')
                ) ORDER BY pf.feature_order, pf.name
            ) as children
        FROM public.system_categorias sc
        JOIN permitted_features pf ON pf.category_id = sc.id
        WHERE sc.is_active = true
          AND (
            v_is_master = true OR
            (sc.module_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenant_modules tm WHERE tm.module_id = sc.module_id AND tm.tenant_id = p_tenant_id AND tm.is_enabled = true))
          )
        GROUP BY sc.id, sc.name, sc.icon, sc.sort_order
    )
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'id', 'cat_' || category_id::text,
                'name', category_name,
                'icon', category_icon,
                'children', children
            ) ORDER BY category_order, category_name
        )
    INTO v_menu
    FROM category_structure;

    RETURN COALESCE(v_menu, '[]'::jsonb);
END;
$$;
