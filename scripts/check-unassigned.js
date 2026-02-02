const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    try {
        const res = await pool.query(`
            SELECT ip.id, ip.id_imovel, ip.created_at
            FROM imovel_prospects ip
            LEFT JOIN imovel_prospect_atribuicoes ipa ON ip.id = ipa.prospect_id
            WHERE ipa.id IS NULL
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
