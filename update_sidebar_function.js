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
    -- [1] Identificação do Usuário
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_role_assignments ura
        JOIN public.user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = p_user_id AND ur.is_system_role = true
    ) INTO _v_is_global_master;

    IF _v_is_global_master = false THEN
        -- Admin local ou Usuário comum
        SELECT ur.level INTO _v_role_level
        FROM public.user_tenant_membership utm
        JOIN public.user_roles ur ON utm.role_id = ur.id
        WHERE utm.user_id = p_user_id AND utm.tenant_id = p_tenant_id AND utm.is_active = true
        ORDER BY ur.level DESC LIMIT 1;

        _v_is_tenant_admin := (COALESCE(_v_role_level, 0) >= 1); 
    ELSE
        _v_is_tenant_admin := true;
    END IF;

    -- [2] Gerar Menu Baseado em Metadados (Hub Master + Sidebar UI)
    SELECT jsonb_agg(item_row)
    INTO _v_menu_output
    FROM (
        WITH RECURSIVE
        authorized_items AS (
            SELECT s.*
            FROM public.sidebar_menu_items s
            WHERE s.is_active = true
              AND (
                -- REGRA 1: PROVISIONAMENTO (Conexão direta com Hub Master via feature_id)
                _v_is_global_master = true 
                OR EXISTS (
                    -- O item de menu aparece se sua funcionalidade (feature_id) estiver em um módulo assinado pelo tenant
                    SELECT 1 FROM public.system_feature_modules sfm 
                    JOIN public.tenant_modules tm ON sfm.module_id = tm.module_id
                    WHERE sfm.feature_id = s.feature_id 
                    AND tm.tenant_id = p_tenant_id 
                    AND tm.is_enabled = true
                )
                OR (
                    -- Itens globais/sistema sem feature_id vinculada
                    s.feature_id IS NULL AND p_system_id = 'admin'
                )
              )
              AND (
                -- REGRA 2: PERMISSÕES DE PERFIL
                _v_is_global_master = true
                OR (
                    -- Bloqueia a MASTER PLATFORM para inquilinos locais
                    NOT (s.id = 83 OR s.parent_id = 83)
                    AND (
                        _v_is_tenant_admin = true
                        OR (
                            -- Usuários comuns dependem de permissões explícitas na role
                            EXISTS (
                                SELECT 1 FROM public.role_permissions rp 
                                JOIN public.user_tenant_membership utm ON rp.role_id = utm.role_id 
                                JOIN public.permissions p ON rp.permission_id = p.id 
                                JOIN public.system_features f ON p.feature_id = f.id 
                                WHERE utm.user_id = p_user_id 
                                AND utm.tenant_id = p_tenant_id 
                                AND f.slug = s.permission_required
                            )
                        )
                        OR s.permission_required IS NULL
                    )
                )
              )
        ),
        menu_tree AS (
            -- Itens autorizados (Folhas)
            SELECT id, parent_id, name, url, icon_name, order_index, is_active, permission_required
            FROM authorized_items
            UNION
            -- Categorias (Pais) - Incluídas se tiverem filhos autorizados
            SELECT p.id, p.parent_id, p.name, p.url, p.icon_name, p.order_index, p.is_active, p.permission_required
            FROM public.sidebar_menu_items p
            INNER JOIN menu_tree mt ON mt.parent_id = p.id
            WHERE p.is_active = true
        ),
        distinct_items AS (
            SELECT DISTINCT ON (id) * FROM menu_tree
        )
        SELECT jsonb_build_object(
            'id',          id,
            'parent_id',   parent_id,
            'name',        name,
            'path',        url,
            'icon',        icon_name,
            'order_index', order_index,
            'is_active',   is_active,
            'permission_required', permission_required
        ) AS item_row
        FROM distinct_items
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
    console.log('Função get_sidebar_menu_for_user atualizada com visão HOLÍSTICA!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
