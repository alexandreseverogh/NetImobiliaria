const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: '127.0.0.1',
  port: 15432,
  user: 'postgres',
  password: 'postgres',
  database: 'net_imobiliaria'
});

async function run() {
    let log = '';
    try {
        log += '--- CORREÇÃO FINAL ---\n';
        
        // 1. Criar a versão TEXT explicitamente
        const sqlText = `
CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id text, p_system_id text DEFAULT 'admin')
 RETURNS TABLE(id uuid, parent_id uuid, name character varying, icon_name character varying, url character varying, order_index integer, has_permission boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY SELECT * FROM public.get_sidebar_menu_for_user(p_user_id::uuid, p_system_id);
END;
$function$;`;

        await pool.query(sqlText);
        log += 'TEXT COMPAT: OK\n';

    } catch (e) {
        log += 'ERRO: ' + e.message + '\n';
    } finally {
        fs.writeFileSync('fix_log.txt', log);
        await pool.end();
        process.exit(0);
    }
}

run();
