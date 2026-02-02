const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    try {
        console.log('--- AUDIT LOGS FOR PROSPECT 76 ---');
        const res = await pool.query(`
            SELECT * FROM audit_logs 
            WHERE resource = 'imovel_prospect_atribuicoes' 
              AND details->>'prospect_id' = '76'
            ORDER BY created_at ASC
        `);
        console.log(JSON.stringify(res.rows, null, 2));

        console.log('\n--- ATRIBUICOES FOR PROSPECT 76 (RAW) ---');
        const res2 = await pool.query(`
            SELECT a.*, u.nome, u.tipo_corretor 
            FROM imovel_prospect_atribuicoes a
            JOIN users u ON u.id = a.corretor_fk
            WHERE a.prospect_id = 76
            ORDER BY a.created_at ASC
        `);
        console.log(JSON.stringify(res2.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
