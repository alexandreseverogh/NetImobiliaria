-- ============================================================
-- ATUALIZAÇÃO MESTRE DA SIDEBAR DINÂMICA
-- ============================================================
-- Esta atualização torna a sidebar reativa ao campo 'is_default_tenant_admin_feature'
-- e também às permissões individuais de cargo (role_permissions).
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
        -- Busca nível no tenant
        SELECT ur.level INTO _v_role_level
        FROM public.user_tenant_membership utm
        JOIN public.user_roles ur ON utm.role_id = ur.id
        WHERE utm.user_id = p_user_id AND utm.tenant_id = p_tenant_id AND utm.is_active = true
        ORDER BY ur.level DESC LIMIT 1;

        -- Fallback para nível global se não achou no tenant
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

    -- [3] Gerar Projeção do Menu
    SELECT jsonb_agg(item_row)
    INTO _v_menu_output
    FROM (
        SELECT jsonb_build_object(
            'id',          s.id,
            'parent_id',   s.parent_id,
            'name',        s.name,
            'path',        s.url,
            'icon',        s.icon_name,
            'order_index', s.order_index,
            'system_id',   s.system_id,
            'is_active',   s.is_active,
            'permission_required', s.permission_required
        ) AS item_row
        FROM public.sidebar_menu_items s
        WHERE s.is_active = true
          AND (s.system_id = p_system_id OR (s.system_id IS NULL AND p_system_id = 'admin'))
          AND (
            -- [REGRA 0] Super Admin vê tudo
            _v_is_superadm = true
            
            -- [REGRA 1] Item que não exige permissão
            OR s.permission_required IS NULL
            
            -- [REGRA 2] NOVO: Reação ao campo 'is_default_tenant_admin_feature'
            -- Se for nível 5 (Admin) e a feature for marcada como padrão, o ícone APARECE.
            OR (
                _v_role_level >= 5 
                AND EXISTS (
                    SELECT 1 FROM public.system_features f 
                    WHERE f.slug = s.permission_required 
                    AND f.is_default_tenant_admin_feature = true
                )
            )

            -- [REGRA 3] NOVO: Permissão explícita no cargo do usuário (Respeito ao RBAC)
            OR EXISTS (
                SELECT 1 FROM public.role_permissions rp
                JOIN public.user_tenant_membership utm ON rp.role_id = utm.role_id
                JOIN public.permissions p ON rp.permission_id = p.id
                JOIN public.system_features f ON p.feature_id = f.id
                WHERE utm.user_id = p_user_id 
                  AND utm.tenant_id = p_tenant_id
                  AND f.slug = s.permission_required
            )

            -- [REGRA 4] Overrides de Empresa (Exceções manuais por tenant)
            OR EXISTS (
                SELECT 1 FROM public.tenant_feature_overrides o
                JOIN public.system_features f ON o.feature_id = f.id
                WHERE o.tenant_id = p_tenant_id AND f.slug = s.permission_required AND o.is_active = true
            )

            -- [REGRA 5] Blueprints de Segmento (O 'padrão de fábrica' do segmento)
            OR (
                NOT EXISTS (SELECT 1 FROM public.tenant_feature_overrides o JOIN public.system_features f ON o.feature_id = f.id WHERE o.tenant_id = p_tenant_id AND f.slug = s.permission_required)
                AND EXISTS (
                    SELECT 1 FROM public.system_segment_blueprints b
                    JOIN public.system_features f ON b.feature_id = f.id
                    WHERE b.segment_id = _v_segment_id AND f.slug = s.permission_required AND b.is_required = true
                )
            )
          )
        ORDER BY s.parent_id NULLS FIRST, s.order_index ASC
    ) items_flat;

    RETURN COALESCE(_v_menu_output, '[]'::jsonb);
END;
$function$;
