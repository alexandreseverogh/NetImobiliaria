const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 15432, user: 'postgres', password: 'postgres', database: 'net_imobiliaria' });

async function check() {
    try {
        const res = await pool.query(`
            SELECT id, name, url, system_id, permission_required, is_active 
            FROM sidebar_menu_items 
            WHERE url LIKE '%/admin/master%' OR name LIKE '%Master%'
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
