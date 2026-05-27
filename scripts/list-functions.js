const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 15432, user: 'postgres', password: 'postgres', database: 'net_imobiliaria' });

async function check() {
    try {
        const res = await pool.query("SELECT proname, oidvectortypes(proargtypes) as args FROM pg_proc WHERE proname = 'get_sidebar_menu_for_user'");
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
