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
            -- Itens de UI (Excluindo o 'MASTER PLATFORM' ID 83 que foi reportado como incorreto)
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
            WHERE s.is_active = true AND s.id <> 83
        ),
        parent_categories AS (
            SELECT DISTINCT ON (c.id)
                'cat_' || c.id as id,
                NULL::text as parent_id,
                c.name,
                NULL::text as path,
                c.icon,
                c.sort_order as order_index
            FROM public.system_categorias c
            WHERE c.id IN (SELECT category_id FROM leaf_items)
               OR (_v_is_global_master = true AND c.id = 22) -- Força categoria Master para Global Master
        ),
        all_items AS (
            SELECT * FROM parent_categories
            UNION ALL
            SELECT id, parent_id, name, path, icon, order_index FROM leaf_items
            UNION ALL
            -- Incluir Provisionamento Master (ID 93) Explicitamente no Grupo Master Real (ID 22)
            SELECT 
                'item_93' as id, 
                'cat_22' as parent_id, 
                'Provisionamento' as name, 
                '/admin/master/provisioning' as path, 
                'ShieldCheckIcon' as icon, 
                0 as order_index 
            WHERE _v_is_global_master = true
        )
        SELECT DISTINCT ON (id) * FROM all_items
    ) final_menu;

    RETURN COALESCE(_v_menu_output, '[]'::jsonb);
END;
$function$;
`;

  try {
    await client.connect();
    await client.query(sql);
    console.log('Sidebar Purificada! Itens Master unificados e lixo removido.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
