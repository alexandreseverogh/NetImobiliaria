const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
    try {
        console.log('--- Iniciando expurgo de vazamentos (CRM não assinado e Agenda Médica) ---');

        await pool.query('BEGIN');

        // [1] Criar o Módulo 'Saúde Digital' e mover a 'Agenda Médica' para ele
        console.log('Isolando Agenda Médica em seu próprio módulo...');
        const newModuleId = '77777777-7777-7777-7777-777777777777'; // A well-defined predictable UUID
        
        await pool.query(`
            INSERT INTO public.system_modules (id, name, slug)
            VALUES ($1, 'Saúde Digital', 'saude')
            ON CONFLICT (id) DO NOTHING;
        `, [newModuleId]);

        // [1.1] Atualiza o item de menu "Agenda Médica" (removendo do admin e colocando no saude)
        await pool.query(`
            -- Remove o vínculo incorreto com admin
            DELETE FROM public.sidebar_menu_item_modules
            WHERE menu_item_id IN (SELECT id FROM public.sidebar_menu_items WHERE name ILIKE '%Agenda Médica%')
            AND module_id = '3f610ec4-013f-4dea-9461-a32e4bdac506';
        `);

        await pool.query(`
            -- Insere o novo vínculo com saúde
            INSERT INTO public.sidebar_menu_item_modules (menu_item_id, module_id)
            SELECT id, $1 FROM public.sidebar_menu_items WHERE name ILIKE '%Agenda Médica%'
            ON CONFLICT DO NOTHING;
        `, [newModuleId]);


        // [2] Refatoração da Função SQL para RESPEITAR ESTRITAMENTE o tenant_modules
        const sqlFunction = `
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
    -- [1] Identificação Agnóstica do Usuário
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

        IF _v_role_level IS NULL THEN
            SELECT ur.level INTO _v_role_level
            FROM public.user_role_assignments ura
            JOIN public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = p_user_id
            ORDER BY ur.level DESC LIMIT 1;
        END IF;

        _v_is_tenant_admin := (COALESCE(_v_role_level, 0) >= 1); 
    ELSE
        _v_is_tenant_admin := true;
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
                -- REGRA 1: PROVISIONAMENTO (Fonte Única de Verdade = Hub Master)
                _v_is_global_master = true 
                OR EXISTS (
                    -- O módulo DEVE estar explicitamente assinado (is_enabled = true) para este tenant
                    SELECT 1 FROM public.sidebar_menu_item_modules smim 
                    JOIN public.tenant_modules tm ON smim.module_id = tm.module_id
                    WHERE smim.menu_item_id = s.id 
                    AND tm.tenant_id = p_tenant_id 
                    AND tm.is_enabled = true
                )
                OR (
                    -- Itens globais de base (sem módulo nenhum) aparecem no portal genérico
                    NOT EXISTS (SELECT 1 FROM public.sidebar_menu_item_modules WHERE menu_item_id = s.id) 
                    AND p_system_id = 'admin'
                )
              )
              AND (
                -- REGRA 2: PERMISSÕES E ISOLAMENTO
                _v_is_global_master = true
                OR (
                    -- Bloqueia a MASTER PLATFORM para os inquirentes locais
                    NOT (s.id = 83 OR s.parent_id = 83)
                    AND (
                        _v_is_tenant_admin = true -- Admin vê tudo o que sua empresa assinou
                        OR (
                            -- Usuários subordinados dependem da role_permissions
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

        await pool.query(sqlFunction);

        await pool.query('COMMIT');
        console.log('✅ Vazamentos contidos. Hub Master é a única fonte da verdade!');
        
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
