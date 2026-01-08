
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function inspectOrder() {
    try {
        console.log('--- Root Items Order ---');
        const res = await pool.query(`
            SELECT id, name, order_index, parent_id, resource 
            FROM sidebar_menu_items 
            WHERE parent_id IS NULL AND is_active = true
            ORDER BY order_index ASC
        `);
        console.table(res.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectOrder();
