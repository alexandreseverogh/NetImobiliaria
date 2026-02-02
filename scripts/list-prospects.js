const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function run() {
    try {
        console.log('Recent Prospects:');
        const res = await pool.query("SELECT * FROM imovel_prospects ORDER BY created_at DESC LIMIT 5");
        console.log(JSON.stringify(res.rows, null, 2));

        console.log('\nRecent Assignments:');
        const res2 = await pool.query("SELECT * FROM imovel_prospect_atribuicoes ORDER BY created_at DESC LIMIT 5");
        console.log(JSON.stringify(res2.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
