-- [GOVERNANÇA SIDEBAR V5] - Estabilização de Hierarquia e Alinhamento de API
-- Resolve problemas de inversão de argumentos e falta de ordenação hierárquica

DROP FUNCTION IF EXISTS public.get_sidebar_menu_for_user(integer, uuid, character varying);
DROP FUNCTION IF EXISTS public.get_sidebar_menu_for_user(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(
    p_user_id UUID, 
    p_system_id TEXT, 
    p_tenant_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    _v_is_superadm BOOLEAN := false;
    _res JSONB;
BEGIN
    -- 1. Verificação de Super Admin (Metadados Dinâmicos)
    -- BUSCA: Se o usuário tem o nível máximo (CC82... é o admin sistema original)
    -- Ou se ele tem is_system_role em alguma tabela de usuários (aqui simplificado por ID e Nível)
    SELECT EXISTS (
        SELECT 1 FROM public.user_tenant_membership utm
        JOIN public.user_roles r ON utm.role_id = r.id
        WHERE utm.user_id = p_user_id 
          AND (r.level >= 6 OR p_user_id = 'cc8220f7-a3fd-40ed-8dbd-a22539328083'::uuid)
    ) INTO _v_is_superadm;

    -- 2. CTE para buscar itens permitidos com herança de visibilidade
    WITH allowed_items AS (
        SELECT 
            s.id,
            s.parent_id,
            s.name,
            s.icon_name as icon,
            s.url as path,
            s.order_index,
            s.system_id,
            s.permission_required
        FROM public.sidebar_menu_items s
        WHERE s.is_active = true
          AND (
            s.system_id = p_system_id 
            OR (s.system_id IS NULL AND p_system_id = 'admin')
          )
          -- [ENTITLEMENT CHECK]
          AND (
            _v_is_superadm = true
            OR p_tenant_id IS NULL 
            OR s.feature_id IS NULL 
            OR EXISTS (
                SELECT 1 
                FROM public.system_feature_modules sfm
                JOIN public.tenant_modules tm ON sfm.module_id = tm.module_id
                WHERE sfm.feature_id = s.feature_id 
                  AND tm.tenant_id = p_tenant_id 
                  AND tm.is_enabled = true
            )
          )
          -- [PERMISSION CHECK]
          AND (
            _v_is_superadm = true
            OR s.permission_required IS NULL 
            OR s.permission_required = ''
            OR EXISTS (
                -- Overrides
                SELECT 1 FROM public.tenant_feature_overrides o 
                JOIN public.system_features f ON o.feature_id = f.id
                WHERE o.tenant_id = p_tenant_id AND o.user_id = p_user_id
                  AND f.slug = s.permission_required AND o.is_active = true
            )
            OR EXISTS (
                -- Blueprints
                SELECT 1 FROM public.system_segment_blueprints b
                JOIN public.tenants t ON b.segment_id = t.segment_id
                JOIN public.system_features f ON b.feature_id = f.id
                WHERE t.id = p_tenant_id AND f.slug = s.permission_required
                  AND b.is_required = true
            )
          )
    )
    SELECT jsonb_agg(items) INTO _res
    FROM (
        SELECT * FROM allowed_items
        ORDER BY parent_id NULLS FIRST, order_index ASC
    ) items;

    RETURN COALESCE(_res, '[]'::jsonb);
END;
$function$;
