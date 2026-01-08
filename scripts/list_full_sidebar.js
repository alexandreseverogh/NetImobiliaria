
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function listAll() {
    try {
        const r = await pool.query(`SELECT id, name, resource, feature_id, permission_action FROM sidebar_menu_items ORDER BY id`);
        console.table(r.rows);
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

listAll();
