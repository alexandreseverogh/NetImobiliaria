
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function inspectChildren() {
    try {
        console.log('--- Inspecting Children of ID 46 and 52 ---');
        const res = await pool.query(`
            SELECT parent_id, id, name, resource 
            FROM sidebar_menu_items 
            WHERE parent_id IN (46, 52)
        `);
        console.table(res.rows);

        // Also confirm details of parents again
        const resP = await pool.query(`
            SELECT id, name, resource, feature_id, order_index 
            FROM sidebar_menu_items 
            WHERE id IN (46, 52)
        `);
        console.table(resP.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectChildren();
