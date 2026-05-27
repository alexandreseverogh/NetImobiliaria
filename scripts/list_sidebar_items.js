const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function list() {
    try {
        const res = await pool.query("SELECT id, name, system_id FROM public.sidebar_menu_items ORDER BY name");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
list();
