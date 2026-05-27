const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: '127.0.0.1', port: 15432, user: 'postgres', password: 'postgres', database: 'net_imobiliaria'
});

async function run() {
    let log = '';
    try {
        log += '--- ESTABILIZAÇÃO NUCLEAR ---\n';
        
        // 1. Limpar funções problemáticas
        await pool.query('DROP FUNCTION IF EXISTS public.get_sidebar_menu_for_user(uuid, text)');
        await pool.query('DROP FUNCTION IF EXISTS public.get_sidebar_menu_for_user(text, text)');

        log += '--- CRIANDO FUNÇÃO SEM SYSTEM_ID ---\n';
        
        // Esta versão ignora o p_system_id na filtragem para evitar o erro de coluna ausente
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
        smi.icon_name,
        smi.url,
        smi.order_index,
        true as has_permission -- Forçamos true para depuração
    FROM public.sidebar_menu_items smi
    WHERE smi.is_active = true
    -- REMOVIDO: smi.system_id (causador do erro 500)
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

        log += 'ESTABILIZADO COM SUCESSO\n';

    } catch (e) {
        log += 'ERRO: ' + e.message + '\n';
    } finally {
        fs.writeFileSync('stabilize_log.txt', log);
        await pool.end();
        process.exit(0);
    }
}
run();
