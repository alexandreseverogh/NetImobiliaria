
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function compareItems() {
    try {
        console.log('--- Comparing Visible vs Invisible Parents ---');
        const res = await pool.query(`
            SELECT id, name, feature_id, resource, is_active 
            FROM sidebar_menu_items 
            WHERE id IN (1, 46)
        `);
        console.table(res.rows);

        // Also check if ID 1 has a feature, is it active?
        if (res.rows.find(r => r.id === 1)?.feature_id) {
            console.log('Item 1 has feature_id, checking system_features...');
            const fRes = await pool.query(`SELECT * FROM system_features WHERE id = ${res.rows.find(r => r.id === 1).feature_id}`);
            console.table(fRes.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

compareItems();
