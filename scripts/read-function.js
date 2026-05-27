const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 15432, user: 'postgres', password: 'postgres', database: 'net_imobiliaria' });

async function check() {
    try {
        const res = await pool.query("SELECT pg_get_functiondef('public.get_sidebar_menu_for_user'::regproc)");
        console.log(res.rows[0].pg_get_functiondef);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
