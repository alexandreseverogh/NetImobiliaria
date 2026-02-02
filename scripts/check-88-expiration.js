const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    try {
        const res = await pool.query(`
            SELECT 
                a.id, 
                a.prospect_id, 
                u.nome, 
                a.status, 
                a.expira_em, 
                a.created_at,
                NOW() as db_now
            FROM imovel_prospect_atribuicoes a 
            JOIN users u ON a.corretor_fk = u.id 
            WHERE a.prospect_id = 88
            ORDER BY a.created_at DESC
            LIMIT 1
        `);
        console.log('Last Assignment for 88:');
        console.log(JSON.stringify(res.rows[0], null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
