
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Docker DB (15432)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function checkCatsFeatures() {
    try {
        console.log('--- CAT 1 (Sistema) ---');
        const r1 = await pool.query("SELECT name FROM system_features WHERE category_id = 1");
        console.log(r1.rows.map(x => x.name));

        console.log('--- CAT 3 (Administrativo) ---');
        const r3 = await pool.query("SELECT name FROM system_features WHERE category_id = 3");
        console.log(r3.rows.map(x => x.name));

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

checkCatsFeatures();
