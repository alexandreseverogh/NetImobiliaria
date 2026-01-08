
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function inspectLinkage() {
    try {
        const res = await pool.query(`
            SELECT id, name, parent_id, resource, order_index 
            FROM sidebar_menu_items 
            WHERE name ILIKE '%Param%' OR resource LIKE 'param%'
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectLinkage();
