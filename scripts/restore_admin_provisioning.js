const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function fix() {
    try {
        console.log('--- Restaurando Visibilidade de Admin (Provisionamento Soberano) ---');

        const fixFunctionSQL = `
CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid, p_system_id text, p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _v_role_level       INTEGER;
    _v_is_global_master BOOLEAN := false;
    _v_is_tenant_admin  BOOLEAN := false;
    _v_segment_id       UUID;
    _v_menu_output      JSONB;
BEGIN
    -- [1] Identificação do Usuário
    -- God User Global
    IF p_user_id = 'cc8220f7-a3fd-40ed-8dbd-a22539328083'::uuid THEN
        _v_is_global_master := true;
        _v_is_tenant_admin := true;
    ELSE
        -- Busca nível no contexto do Tenant atual
        SELECT ur.level INTO _v_role_level
        FROM public.user_tenant_membership utm
        JOIN public.user_roles ur ON utm.role_id = ur.id
        WHERE utm.user_id = p_user_id AND utm.tenant_id = p_tenant_id AND utm.is_active = true
        ORDER BY ur.level DESC LIMIT 1;

        -- Se for level >= 1 (ou se for o dono do tenant), consideramos Admin para fins de Provisionamento
        _v_is_tenant_admin := (COALESCE(_v_role_level, 0) >= 1); 
    END IF;

    -- [2] Identificar Segmento da empresa
    SELECT segment_id INTO _v_segment_id FROM public.tenants WHERE id = p_tenant_id;
    
    -- [3] Gerar Menu
    SELECT jsonb_agg(item_row)
    INTO _v_menu_output
    FROM (
        WITH RECURSIVE
        authorized_items AS (
            SELECT s.*
            FROM public.sidebar_menu_items s
            WHERE s.is_active = true
              AND (
                -- REGRA 1: PROVISIONAMENTO (A base de tudo)
                _v_is_global_master = true 
                OR EXISTS (
                    -- O item deve pertencer a um módulo habilitado para o Tenant
                    SELECT 1 FROM public.sidebar_menu_item_modules smim 
                    JOIN public.tenant_modules tm ON smim.module_id = tm.module_id
                    WHERE smim.menu_item_id = s.id 
                    AND tm.tenant_id = p_tenant_id 
                    AND tm.is_enabled = true
                )
                OR EXISTS (
                    -- Ou ao Blueprint do Segmento
                    SELECT 1 FROM public.sidebar_menu_item_modules smim 
                    JOIN public.system_segment_modules ssm ON smim.module_id = ssm.module_id
                    WHERE smim.menu_item_id = s.id 
                    AND ssm.segment_id = _v_segment_id 
                    AND ssm.is_active = true
                )
                OR (
                    -- Itens globais/públicos sem módulo atrelado aparecem no Admin
                    NOT EXISTS (SELECT 1 FROM public.sidebar_menu_item_modules WHERE menu_item_id = s.id) 
                    AND p_system_id = 'admin'
                )
              )
              AND (
                -- REGRA 2: PERMISSÃO (Quem pode ver o que está provisionado)
                _v_is_global_master = true
                OR _v_is_tenant_admin = true -- Admin do Tenant vê TUDO o que foi provisionado para ele
                OR (
                    -- Usuário comum: só vê se tiver a permissão E o módulo estiver ativo
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
                OR s.permission_required IS NULL -- Itens sem permissão requerida (públicos)
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

        await pool.query(fixFunctionSQL);
        console.log('✅ Função get_sidebar_menu_for_user atualizada: Sincronização Hub Master FULL.');
        console.log('ℹ️ Admin de Tenant agora visualiza todos os módulos provisionados corretamente.');

    } catch (e) {
        console.error('❌ Erro na correção:', e);
    } finally {
        await pool.end();
    }
}

fix();
