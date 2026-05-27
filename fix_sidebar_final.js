const { Client } = require('pg');

async function main() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432
  });

  const sql = `
CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid, p_system_id text, p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _v_is_global_master BOOLEAN := false;
    _v_is_tenant_admin  BOOLEAN := false;
    _v_role_level       INTEGER;
    _v_menu_output      JSONB;
BEGIN
    -- 1. Identificar privilégios do usuário
    SELECT EXISTS (
        SELECT 1 FROM public.user_role_assignments ura
        JOIN public.user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = p_user_id AND ur.is_system_role = true
    ) INTO _v_is_global_master;

    IF NOT _v_is_global_master THEN
        SELECT ur.level INTO _v_role_level
        FROM public.user_tenant_membership utm
        JOIN public.user_roles ur ON utm.role_id = ur.id
        WHERE utm.user_id = p_user_id AND utm.tenant_id = p_tenant_id AND utm.is_active = true
        ORDER BY ur.level DESC LIMIT 1;
        _v_is_tenant_admin := (COALESCE(_v_role_level, 0) >= 1);
    ELSE
        _v_is_tenant_admin := true;
    END IF;

    -- 2. Gerar Menu (Categorias -> Funcionalidades)
    SELECT jsonb_agg(row_to_json(final_menu))
    INTO _v_menu_output
    FROM (
        WITH authorized_features AS (
            -- Features habilitadas pelo Hub Master
            SELECT DISTINCT f.id, f.category_id
            FROM public.system_features f
            WHERE f.is_active = true
              AND (
                _v_is_global_master = true
                OR EXISTS (
                    SELECT 1 FROM public.system_feature_modules sfm 
                    JOIN public.tenant_modules tm ON sfm.module_id = tm.module_id
                    WHERE sfm.feature_id = f.id AND tm.tenant_id = p_tenant_id AND tm.is_enabled = true
                )
              )
              AND (
                _v_is_global_master = true OR _v_is_tenant_admin = true
                OR EXISTS (
                    SELECT 1 FROM public.role_permissions rp 
                    JOIN public.user_tenant_membership utm ON rp.role_id = utm.role_id 
                    JOIN public.permissions p ON rp.permission_id = p.id 
                    WHERE utm.user_id = p_user_id AND utm.tenant_id = p_tenant_id AND p.feature_id = f.id
                )
              )
        ),
        leaf_items AS (
            -- Itens de UI vinculados às features autorizadas
            SELECT DISTINCT ON (s.id)
                'item_' || s.id as id,
                'cat_' || f.category_id as parent_id,
                s.name,
                s.url as path,
                s.icon_name as icon,
                s.order_index,
                f.category_id
            FROM public.sidebar_menu_items s
            JOIN authorized_features f ON s.feature_id = f.id
            WHERE s.is_active = true
        ),
        parent_categories AS (
            -- Categorias que possuem pelo menos um item autorizado
            SELECT DISTINCT ON (c.id)
                'cat_' || c.id as id,
                NULL::text as parent_id,
                c.name,
                NULL::text as path,
                c.icon,
                c.sort_order as order_index
            FROM public.system_categorias c
            WHERE c.id IN (SELECT category_id FROM leaf_items)
        )
        -- União Final para retorno plano (Frontend montará a árvore)
        SELECT * FROM parent_categories
        UNION ALL
        SELECT id, parent_id, name, path, icon, order_index FROM leaf_items

        -- Adição de item de sistema para Master (Exceção)
        UNION ALL
        SELECT 
            'item_master' as id, 
            'cat_master' as parent_id, 
            'Provisionamento' as name, 
            '/admin/master/provisioning' as path, 
            'ShieldCheckIcon' as icon, 
            99 as order_index
        WHERE _v_is_global_master = true
        
        UNION ALL
        SELECT 
            'cat_master' as id, 
            NULL as parent_id, 
            'Master Governance' as name, 
            NULL as path, 
            'ShieldCheckIcon' as icon, 
            99 as order_index
        WHERE _v_is_global_master = true
    ) final_menu;

    RETURN COALESCE(_v_menu_output, '[]'::jsonb);
END;
$function$;
