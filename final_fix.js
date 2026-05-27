const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: '127.0.0.1', port: 15432, user: 'postgres', password: 'postgres', database: 'net_imobiliaria'
});

async function run() {
    let log = '';
    try {
        log += '--- CORREÇÃO DE COLUNAS ---\n';
        
        const sql = `
CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid, p_system_id text DEFAULT 'admin')
 RETURNS TABLE(id uuid, parent_id uuid, name character varying, icon_name character varying, url character varying, order_index integer, has_permission boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        smi.id,
        smi.parent_id,
        smi.name,
        smi.icon_name, -- CORRIGIDO: O nome real é icon_name
        smi.url,
        smi.order_index,
        CASE
            WHEN smi.feature_id IS NOT NULL THEN
                EXISTS (
                    SELECT 1
                    FROM public.role_permissions rp
                    JOIN public.user_role_assignments ura ON rp.role_id = ura.role_id  
                    JOIN public.permissions p ON rp.permission_id = p.id
                    WHERE ura.user_id = p_user_id
                    AND p.feature_id = smi.feature_id
                )
            WHEN smi.feature_id IS NULL THEN true
            ELSE false
        END as has_permission
    FROM public.sidebar_menu_items smi
    WHERE smi.is_active = true
    AND (smi.system_id = p_system_id OR (smi.system_id IS NULL AND p_system_id = 'admin'))
    ORDER BY smi.order_index;
END;
$function$;`;

        await pool.query(sql);
        log += 'PRINCIPAL (icon_name): OK\n';

        await pool.query(`
            CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id text, p_system_id text DEFAULT 'admin')
            RETURNS SETOF public.get_sidebar_menu_for_user AS $$
            BEGIN
                RETURN QUERY SELECT * FROM public.get_sidebar_menu_for_user(p_user_id::uuid, p_system_id);
            END; $$ LANGUAGE plpgsql;
        `);
        log += 'TEXT COMPAT: OK\n';

    } catch (e) {
        log += 'ERRO: ' + e.message + '\n';
    } finally {
        fs.writeFileSync('final_fix_log.txt', log);
        await pool.end();
        process.exit(0);
    }
}
run();
