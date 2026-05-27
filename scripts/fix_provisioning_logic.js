const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function fixProvisioningLogic() {
    try {
        console.log('--- Refinando Lógica de Governança para Provisionamento Master ---');

        const sql = `
CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid, p_system_id text, p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _v_role_level   INTEGER;
    _v_is_superadm  BOOLEAN;
    _v_segment_id   UUID;
    _v_module_id    UUID;
    _v_menu_output  JSONB;
BEGIN
    -- [1] Identificacao de Nivel e Super Admin
    -- Nota: Super Admin Global (cc822...) vê tudo o que estiver ativo na arquitetura
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

    -- [2] Identificacao de Contexto (Segmento e Modulo solicitado)
    SELECT segment_id INTO _v_segment_id FROM public.tenants WHERE id = p_tenant_id;
    SELECT id INTO _v_module_id FROM public.system_modules WHERE slug = p_system_id;

    -- [3] Gerar Menu com Governança de Provisionamento de Ferro
    SELECT jsonb_agg(item_row)
    INTO _v_menu_output
    FROM (
        WITH RECURSIVE
        authorized_items AS (
            SELECT s.*
            FROM public.sidebar_menu_items s
            WHERE s.is_active = true
              -- 3.1 Verificação de Módulo (Contexto da página atual: Admin, CRM, etc.)
              AND (
                EXISTS (
                    SELECT 1 FROM public.sidebar_menu_item_modules smim 
                    WHERE smim.menu_item_id = s.id 
                    AND smim.module_id = _v_module_id
                )
                OR (NOT EXISTS (SELECT 1 FROM public.sidebar_menu_item_modules WHERE menu_item_id = s.id) AND p_system_id = 'admin')
              )
              -- 3.2 Governança de Provisionamento Master (A empresa tem acesso a esta feature?)
              AND (
                _v_is_superadm = true OR -- Super Admin Global ignora limites de tenant
                EXISTS (
                    SELECT 1 
                    FROM public.tenant_feature_overrides tfo
                    JOIN public.system_features f ON tfo.feature_id = f.id
                    JOIN public.system_feature_modules fm ON f.id = fm.feature_id
                    JOIN public.tenant_modules tm ON fm.module_id = tm.module_id
                    WHERE f.slug = s.permission_required -- A feature exigida pelo menu
                      AND tfo.tenant_id = p_tenant_id     -- Provisionada para esta empresa
                      AND tfo.is_active = true
                      AND tm.tenant_id = p_tenant_id      -- O módulo da feature está habilitado para a empresa
                      AND tm.is_enabled = true
                )
                OR s.permission_required IS NULL -- Itens sem permissão exigida (separadores, etc)
              )
              -- 3.3 Verificação de Permissões de Usuário (O usuário tem o perfil/role necessário?)
              AND (
                _v_is_superadm = true
                OR (
                    -- Se o item exige uma feature, verificar se o usuário tem permissão nela
                    EXISTS (
                        SELECT 1 
                        FROM public.role_permissions rp 
                        JOIN public.user_tenant_membership utm ON rp.role_id = utm.role_id 
                        JOIN public.permissions p ON rp.permission_id = p.id 
                        JOIN public.system_features f ON p.feature_id = f.id 
                        WHERE utm.user_id = p_user_id 
                          AND utm.tenant_id = p_tenant_id 
                          AND f.slug = s.permission_required
                    )
                    -- Ou se for um Tenant Admin (level 5) e a feature for padrão para Admins
                    OR (_v_role_level >= 5 AND EXISTS (SELECT 1 FROM public.system_features f WHERE f.slug = s.permission_required AND f.is_default_tenant_admin_feature = true))
                )
              )
        ),
        menu_tree AS (
            SELECT id, parent_id, name, url, icon_name, order_index, is_active, permission_required
            FROM authorized_items
            UNION
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

        await pool.query(sql);
        console.log('✔ Governança de Provisionamento Master aplicada com sucesso à função SQL.');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

fixProvisioningLogic();
