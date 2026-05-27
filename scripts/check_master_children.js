const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
    try {
        const res = await pool.query(`
            SELECT id, name, permission_required, parent_id
            FROM sidebar_menu_items
            WHERE name ILIKE '%master%' OR parent_id IN (
                SELECT id FROM sidebar_menu_items WHERE name ILIKE '%master%'
            )
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
