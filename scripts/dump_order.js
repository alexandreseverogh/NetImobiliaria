
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function dumpOrder() {
    try {
        const res = await pool.query(`
            SELECT id, name, order_index, parent_id, resource 
            FROM sidebar_menu_items 
            WHERE parent_id IS NULL
            ORDER BY order_index ASC
        `);

        fs.writeFileSync('sidebar_order.txt', JSON.stringify(res.rows, null, 2));
        console.log('Dados salvos em sidebar_order.txt');

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

dumpOrder();
