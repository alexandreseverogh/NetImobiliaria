const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    try {
        const res = await pool.query("SELECT * FROM imovel_prospect_atribuicoes WHERE prospect_id = 85");
        console.log('Assignments for 85:', JSON.stringify(res.rows, null, 2));

        const prospect = await pool.query("SELECT * FROM imovel_prospects WHERE id = 85");
        console.log('Prospect 85:', JSON.stringify(prospect.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
