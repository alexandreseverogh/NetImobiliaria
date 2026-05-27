CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid, p_system_id text, p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
      DECLARE
          _v_is_master_admin BOOLEAN := false;
          _v_segment_id      UUID;
          _v_menu_output     JSONB;
      BEGIN
          -- DETERMINA├ç├âO DE MASTER ADMIN (Apenas Super Admin Global)
          -- Somente quem tem a role ID 1 (Super Admin) ou nome exato recebeu o bypass total.
          SELECT EXISTS (
              SELECT 1 
              FROM public.user_role_assignments ura
              JOIN public.user_roles ur ON ura.role_id = ur.id
              WHERE ura.user_id = p_user_id
                AND (ur.id = 1 OR ur.name = 'Super Admin')
          ) INTO _v_is_master_admin;

          -- Se n├úo for master, verificamos se ele ├® Super Admin no contexto do Tenant
          -- (Mas para o Admin de empresa, queremos que ele respeite permiss├Áes, ent├úo n├úo damos bypass aqui)

          -- [3] Segmento da empresa
          SELECT segment_id INTO _v_segment_id
          FROM public.tenants WHERE id = p_tenant_id;

          -- [4] Sele├º├úo de Itens
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
                AND (
                  s.system_id = p_system_id 
                  OR (s.system_id IS NULL AND p_system_id = 'admin')
                )
                AND (
                  _v_is_master_admin = true -- Bypass total apenas para o Master
                  OR s.permission_required IS NULL -- Itens p├║blicos do painel
                  OR (
                    -- Para usu├írios comuns (e admin de empresa), deve haver permiss├úo expl├¡cita
                    -- OU o item deve estar no blueprint como obrigat├│rio E ele ter a role correta.
                    EXISTS (
                        -- Verifica se o usu├írio tem a permiss├úo espec├¡fica no recurso
                        SELECT 1 
                        FROM public.user_role_assignments ura
                        JOIN public.role_permissions rp ON ura.role_id = rp.role_id
                        JOIN public.permissions p ON rp.permission_id = p.id
                        JOIN public.system_features f ON p.feature_id = f.id
                        WHERE ura.user_id = p_user_id
                          AND f.slug = s.permission_required
                          AND f.is_active = true
                        
                        UNION
                        
                        -- Ou via membresia de tenant
                        SELECT 1
                        FROM public.user_tenant_membership utm
                        JOIN public.role_permissions rp ON utm.role_id = rp.role_id
                        JOIN public.permissions p ON rp.permission_id = p.id
                        JOIN public.system_features f ON p.feature_id = f.id
                        WHERE utm.user_id = p_user_id
                          AND utm.tenant_id = p_tenant_id
                          AND f.slug = s.permission_required
                          AND utm.is_active = true
                    )
                  )
                )
              ORDER BY s.parent_id NULLS FIRST, s.order_index ASC
          ) items_flat;

          RETURN COALESCE(_v_menu_output, '[]'::jsonb);
      END;
      $function$

