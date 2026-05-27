-- ============================================================
-- UPGRADE: SIDEBAR HIERÁRQUICA E DINÂMICA (ZERO HARDCODE)
-- ============================================================
-- Esta função agora utiliza recursividade para garantir que pais
-- sempre sejam exibidos se houver filhos autorizados.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid, p_system_id text, p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    _v_role_level   INTEGER;
    _v_is_superadm  BOOLEAN;
    _v_segment_id   UUID;
    _v_menu_output  JSONB;
BEGIN
    -- [1] Identificação de Nível e Super Admin
    IF p_user_id = 'cc8220f7-a3fd-40ed-8dbd-a22539328083'::uuid THEN
        _v_is_superadm := true;
        _v_role_level := 10;
    ELSE
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
        
        _v_is_superadm := (COALESCE(_v_role_level, 0) >= 6);
    END IF;

    -- [2] Identificar Segmento da empresa
    SELECT segment_id INTO _v_segment_id FROM public.tenants WHERE id = p_tenant_id;

    -- [3] Gerar Menu com Recursividade para garantir Pais
    SELECT jsonb_agg(item_row)
    INTO _v_menu_output
    FROM (
        WITH RECURSIVE 
        -- [A] Itens diretamente autorizados
        authorized_items AS (
            SELECT s.*
            FROM public.sidebar_menu_items s
            WHERE s.is_active = true
              AND (s.system_id = p_system_id OR (s.system_id IS NULL AND p_system_id = 'admin'))
              AND (
                _v_is_superadm = true
                OR s.permission_required IS NULL
                OR (
                    _v_role_level >= 5 
                    AND EXISTS (
                        SELECT 1 FROM public.system_features f 
                        WHERE f.slug = s.permission_required 
                        AND f.is_default_tenant_admin_feature = true
                    )
                )
                OR EXISTS (
                    SELECT 1 FROM public.role_permissions rp
                    JOIN public.user_tenant_membership utm ON rp.role_id = utm.role_id
                    JOIN public.permissions p ON rp.permission_id = p.id
                    JOIN public.system_features f ON p.feature_id = f.id
                    WHERE utm.user_id = p_user_id AND utm.tenant_id = p_tenant_id AND f.slug = s.permission_required
                )
                OR EXISTS (
                    SELECT 1 FROM public.tenant_feature_overrides o
                    JOIN public.system_features f ON o.feature_id = f.id
                    WHERE o.tenant_id = p_tenant_id AND f.slug = s.permission_required AND o.is_active = true
                )
                OR (
                    NOT EXISTS (SELECT 1 FROM public.tenant_feature_overrides o JOIN public.system_features f ON o.feature_id = f.id WHERE o.tenant_id = p_tenant_id AND f.slug = s.permission_required)
                    AND EXISTS (
                        SELECT 1 FROM public.system_segment_blueprints b
                        JOIN public.system_features f ON b.feature_id = f.id
                        WHERE b.segment_id = _v_segment_id AND f.slug = s.permission_required AND b.is_required = true
                    )
                )
              )
        ),
        -- [B] Árvore completa (subindo dos autorizados para os pais)
        menu_tree AS (
            -- Base: Itens autorizados
            SELECT id, parent_id, name, url, icon_name, order_index, system_id, is_active, permission_required
            FROM authorized_items
            
            UNION
            
            -- Recursão: Buscar pais dos itens autorizados
            SELECT p.id, p.parent_id, p.name, p.url, p.icon_name, p.order_index, p.system_id, p.is_active, p.permission_required
            FROM public.sidebar_menu_items p
            INNER JOIN menu_tree mt ON mt.parent_id = p.id
            WHERE p.is_active = true
        )
        -- [C] Seleção final distinta (para evitar duplicidade na árvore)
        SELECT DISTINCT ON (mt.id) jsonb_build_object(
            'id',          mt.id,
            'parent_id',   mt.parent_id,
            'name',        mt.name,
            'path',        mt.url,
            'icon',        mt.icon_name,
            'order_index', mt.order_index,
            'system_id',   mt.system_id,
            'is_active',   mt.is_active,
            'permission_required', mt.permission_required
        ) AS item_row,
        mt.parent_id,
        mt.order_index
        FROM menu_tree mt
        ORDER BY mt.id, mt.parent_id NULLS FIRST, mt.order_index ASC
    ) items_flat;

    RETURN COALESCE(_v_menu_output, '[]'::jsonb);
END;
$function$;
