const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 15432, user: 'postgres', password: 'postgres', database: 'net_imobiliaria' });

async function check() {
    try {
        const res = await pool.query("SELECT DISTINCT system_id FROM sidebar_menu_items");
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
