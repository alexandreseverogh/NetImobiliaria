const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function migrate() {
    try {
        console.log('--- Iniciando Migração para Governança Multi-Módulo ---');

        // 1. Criar a tabela de relacionamento
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.sidebar_menu_item_modules (
                menu_item_id INTEGER REFERENCES public.sidebar_menu_items(id) ON DELETE CASCADE,
                module_id UUID REFERENCES public.system_modules(id) ON DELETE CASCADE,
                PRIMARY KEY (menu_item_id, module_id)
            );
        `);
        console.log('✔ Tabela public.sidebar_menu_item_modules criada/verificada.');

        // 2. Migrar dados existentes da coluna system_id (que agora é legada)
        // Precisamos mapear os slugs 'admin' e 'crm' para os UUIDs reais
        const modulesRes = await pool.query("SELECT id, slug FROM public.system_modules");
        const moduleMap = {};
        modulesRes.rows.forEach(m => moduleMap[m.slug] = m.id);

        const itemsRes = await pool.query("SELECT id, system_id FROM public.sidebar_menu_items WHERE system_id IS NOT NULL");
        
        for (const item of itemsRes.rows) {
            const slugs = [];
            if (item.system_id === 'both') {
                slugs.push('admin', 'crm');
            } else {
                slugs.push(item.system_id);
            }

            for (const slug of slugs) {
                const moduleId = moduleMap[slug];
                if (moduleId) {
                    await pool.query(
                        "INSERT INTO public.sidebar_menu_item_modules (menu_item_id, module_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                        [item.id, moduleId]
                    );
                }
            }
        }
        console.log(`✔ Migrados relacionamentos para ${itemsRes.rows.length} itens.`);

        // 3. Atualizar a Função SQL para usar a nova tabela
        const fixFunctionSQL = `
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
    
    -- [2.1] Identificar o Module ID solicitado pelo slug (p_system_id)
    SELECT id INTO _v_module_id FROM public.system_modules WHERE slug = p_system_id;

    -- [3] Gerar Menu com Transparencia de Ordenacao
    SELECT jsonb_agg(item_row)
    INTO _v_menu_output
    FROM (
        WITH RECURSIVE
        authorized_items AS (
            SELECT s.*
            FROM public.sidebar_menu_items s
            WHERE s.is_active = true
              AND (
                -- Verificação Multi-Módulo Unificada
                _v_is_superadm = true -- Super Admin vê tudo (God View)
                OR EXISTS (
                    SELECT 1 FROM public.sidebar_menu_item_modules smim 
                    JOIN public.tenant_modules tm ON smim.module_id = tm.module_id
                    WHERE smim.menu_item_id = s.id 
                    AND tm.tenant_id = p_tenant_id 
                    AND tm.is_enabled = true
                )
                OR EXISTS (
                    SELECT 1 FROM public.sidebar_menu_item_modules smim 
                    JOIN public.system_segment_modules ssm ON smim.module_id = ssm.module_id
                    WHERE smim.menu_item_id = s.id 
                    AND ssm.segment_id = _v_segment_id 
                    AND ssm.is_active = true
                )
                OR
                -- Fallback para preservação de legado (se o item não tiver módulos, aparece no Admin)
                (NOT EXISTS (SELECT 1 FROM public.sidebar_menu_item_modules WHERE menu_item_id = s.id) AND p_system_id = 'admin')
              )
              AND (
                _v_is_superadm = true
                OR (
                    EXISTS (
                        SELECT 1
                        FROM public.system_features f
                        JOIN public.system_feature_modules fm ON f.id = fm.feature_id
                        LEFT JOIN public.system_segment_modules sm ON (fm.module_id = sm.module_id AND sm.segment_id = _v_segment_id AND sm.is_active = true)
                        LEFT JOIN public.tenant_modules tm ON (fm.module_id = tm.module_id AND tm.tenant_id = p_tenant_id AND tm.is_enabled = true)
                        WHERE f.slug = s.permission_required
                          AND (sm.module_id IS NOT NULL OR tm.module_id IS NOT NULL)
                    )
                    AND (
                        s.permission_required IS NULL
                        OR (_v_role_level >= 5 AND EXISTS (SELECT 1 FROM public.system_features f WHERE f.slug = s.permission_required AND f.is_default_tenant_admin_feature = true))
                        OR EXISTS (SELECT 1 FROM public.role_permissions rp JOIN public.user_tenant_membership utm ON rp.role_id = utm.role_id JOIN public.permissions p ON rp.permission_id = p.id JOIN public.system_features f ON p.feature_id = f.id WHERE utm.user_id = p_user_id AND utm.tenant_id = p_tenant_id AND f.slug = s.permission_required)
                    )
                )
                OR EXISTS (SELECT 1 FROM public.tenant_feature_overrides o JOIN public.system_features f ON o.feature_id = f.id WHERE o.tenant_id = p_tenant_id AND f.slug = s.permission_required AND o.is_active = true)
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
        console.log('✔ Função SQL get_sidebar_menu_for_user atualizada para arquitetura multi-módulo.');

        console.log('--- Migração finalizada com sucesso ---');
    } catch (e) {
        console.error('❌ Erro na migração:', e);
    } finally {
        await pool.end();
    }
}

migrate();
