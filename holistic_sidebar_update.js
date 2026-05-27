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
    _v_role_level       INTEGER;
    _v_is_global_master BOOLEAN := false;
    _v_is_tenant_admin  BOOLEAN := false;
    _v_menu_output      JSONB;
BEGIN
    -- [1] Identificação de Nível de Usuário
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_role_assignments ura
        JOIN public.user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = p_user_id AND ur.is_system_role = true
    ) INTO _v_is_global_master;

    IF _v_is_global_master = false THEN
        SELECT ur.level INTO _v_role_level
        FROM public.user_tenant_membership utm
        JOIN public.user_roles ur ON utm.role_id = ur.id
        WHERE utm.user_id = p_user_id AND utm.tenant_id = p_tenant_id AND utm.is_active = true
        ORDER BY ur.level DESC LIMIT 1;
        _v_is_tenant_admin := (COALESCE(_v_role_level, 0) >= 1); 
    ELSE
        _v_is_tenant_admin := true;
    END IF;

    -- [2] Gerar Menu Holístico (Categorias Master + Sidebar UI metadata)
    -- Esta query reconstrói a hierarquia da sidebar baseada puramente na categorização do Hub Master
    SELECT jsonb_agg(menu_row)
    INTO _v_menu_output
    FROM (
        -- Primeiro: Pegamos todas as funcionalidades autorizadas (Agnóstico a categoria)
        WITH authorized_features AS (
            SELECT f.id, f.name, f.slug, f.category_id, f.url as feature_url
            FROM public.system_features f
            WHERE f.is_active = true
              AND (
                _v_is_global_master = true
                OR EXISTS (
                    -- Validação no Hub Master: O módulo associado à funcionalidade deve estar ativo para o tenant
                    SELECT 1 FROM public.system_feature_modules sfm 
                    JOIN public.tenant_modules tm ON sfm.module_id = tm.module_id
                    WHERE sfm.feature_id = f.id 
                    AND tm.tenant_id = p_tenant_id 
                    AND tm.is_enabled = true
                )
              )
              AND (
                -- Validação de Permissões de Perfil
                _v_is_global_master = true
                OR _v_is_tenant_admin = true
                OR EXISTS (
                    SELECT 1 FROM public.role_permissions rp 
                    JOIN public.user_tenant_membership utm ON rp.role_id = utm.role_id 
                    JOIN public.permissions p ON rp.permission_id = p.id 
                    WHERE utm.user_id = p_user_id AND utm.tenant_id = p_tenant_id AND p.feature_id = f.id
                )
              )
        ),
        -- Segundo: Maquiamos as funcionalidades com os metadados visuais da sidebar_menu_items
        menu_leafs AS (
            SELECT 
                s.id as menu_item_id,
                cat.id as parent_category_id,
                cat.name as group_name,
                s.name as display_name,
                s.url as path,
                s.icon_name as icon,
                s.order_index,
                cat.sort_order as cat_order
            FROM public.sidebar_menu_items s
            JOIN authorized_features af ON s.feature_id = af.id
            JOIN public.system_categorias cat ON af.category_id = cat.id
            WHERE s.is_active = true
            
            UNION ALL
            
            -- Tratamento de itens especiais/sistema que não são features (como Provisionamento)
            SELECT 
                s.id as menu_item_id,
                COALESCE(cat.id, 999) as parent_category_id,
                COALESCE(cat.name, 'Sistema') as group_name,
                s.name as display_name,
                s.url as path,
                s.icon_name as icon,
                s.order_index,
                COALESCE(cat.sort_order, 999) as cat_order
            FROM public.sidebar_menu_items s
            LEFT JOIN public.system_categorias cat ON s.parent_id = cat.id -- Tentativa de backup
            WHERE s.is_active = true 
              AND s.feature_id IS NULL 
              AND s.parent_id IS NOT NULL 
              AND _v_is_global_master = true -- Itens sem feature hoje são só para Master
        ),
        -- Terceiro: Criamos os itens "Pai" (Categorias) baseados no que restou de filhos autorizados
        menu_final AS (
            -- Os Pais (Categorias)
            SELECT DISTINCT ON (parent_category_id)
                parent_category_id as id,
                NULL::integer as parent_id,
                group_name as name,
                NULL as path,
                cat.icon as icon,
                cat_order as order_index
            FROM menu_leafs ml
            JOIN public.system_categorias cat ON ml.parent_category_id = cat.id
            
            UNION ALL
            
            -- Os Filhos (Submenus)
            SELECT 
                menu_item_id as id,
                parent_category_id as parent_id,
                display_name as name,
                path,
                icon,
                order_index
            FROM menu_leafs
        )
        SELECT jsonb_build_object(
            'id',          id,
            'parent_id',   parent_id,
            'name',        name,
            'path',        path,
            'icon',        icon,
            'order_index', order_index
        ) AS menu_row
        FROM menu_final
        ORDER BY 
            (parent_id IS NOT NULL), 
            parent_id ASC NULLS FIRST, 
            order_index ASC
    ) items_flat;

    RETURN COALESCE(_v_menu_output, '[]'::jsonb);
END;
$function$;
`;

  try {
    await client.connect();
    await client.query(sql);
    console.log('Sidebar unificada com Sucesso! Governança Master agora é a única fonte de verdade.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
