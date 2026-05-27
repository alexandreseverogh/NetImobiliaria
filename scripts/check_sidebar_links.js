const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
    try {
        console.log('--- Verificando Vínculos de Módulos para Itens de CRM ---');
        const res = await pool.query(`
            SELECT s.id, s.name, m.slug as module_slug 
            FROM public.sidebar_menu_items s 
            LEFT JOIN public.sidebar_menu_item_modules smim ON s.id = smim.menu_item_id 
            LEFT JOIN public.system_modules m ON smim.module_id = m.id 
            WHERE s.name ILIKE '%CRM%' OR s.url ILIKE '%crm%'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
