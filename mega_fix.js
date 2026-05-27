const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: '127.0.0.1', port: 15432, user: 'postgres', password: 'postgres', database: 'net_imobiliaria'
});

async function run() {
    let log = '';
    try {
        log += '--- COLUNAS REAIS DA TABELA ---\n';
        const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'sidebar_menu_items'");
        log += JSON.stringify(cols.rows.map(c => c.column_name)) + '\n';

        log += '--- DELETANDO FUNÇÕES ANTIGAS ---\n';
        // Vamos limpar todas as variações conhecidas
        await pool.query('DROP FUNCTION IF EXISTS public.get_sidebar_menu_for_user(uuid, text)');
        await pool.query('DROP FUNCTION IF EXISTS public.get_sidebar_menu_for_user(text, text)');
        await pool.query('DROP FUNCTION IF EXISTS public.get_sidebar_menu_for_user(text)');
        await pool.query('DROP FUNCTION IF EXISTS public.get_sidebar_menu_for_user(uuid)');
        await pool.query('DROP FUNCTION IF EXISTS public.fn_get_sidebar_menu_v3(text, text)');
        await pool.query('DROP FUNCTION IF EXISTS public.fn_get_sidebar_menu_v2(text, text)');

        log += '--- RECONSTRUINDO COM COLUNA CORRETA ---\n';
        
        // Verificamos se usamos 'icon' ou 'icon_name' baseado nas colunas reais
        const hasIconName = cols.rows.some(c => c.column_name === 'icon_name');
        const iconCol = hasIconName ? 'icon_name' : 'icon';
        
        log += `Usando coluna de ícone: ${iconCol}\n`;

        const sql = `
CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid, p_system_id text DEFAULT 'admin')
 RETURNS TABLE(id uuid, parent_id uuid, name character varying, icon_name character varying, url character varying, order_index integer, has_permission boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $f$
BEGIN
    RETURN QUERY
    SELECT
        smi.id,
        smi.parent_id,
        smi.name,
        smi.${iconCol} as icon_name,
        smi.url,
        smi.order_index,
        true as has_permission
    FROM public.sidebar_menu_items smi
    WHERE smi.is_active = true
    AND (smi.system_id = p_system_id OR (smi.system_id IS NULL AND p_system_id = 'admin'))
    ORDER BY smi.order_index;
END;
$f$;`;

        await pool.query(sql);
        
        // Versão de compatibilidade TEXT
        await pool.query(`
            CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id text, p_system_id text DEFAULT 'admin')
            RETURNS TABLE(id uuid, parent_id uuid, name character varying, icon_name character varying, url character varying, order_index integer, has_permission boolean)
            LANGUAGE plpgsql AS $f$
            BEGIN
                RETURN QUERY SELECT * FROM public.get_sidebar_menu_for_user(p_user_id::uuid, p_system_id);
            END; $f$;
        `);

        log += 'SUCESSO TOTAL\n';

    } catch (e) {
        log += 'ERRO: ' + e.message + '\n';
    } finally {
        fs.writeFileSync('mega_fix_log.txt', log);
        await pool.end();
        process.exit(0);
    }
}
run();
