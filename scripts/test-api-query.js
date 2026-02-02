const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    try {
        console.log('Testing Expired Query...');
        const expiredQuery = `
          SELECT 
            pa.id, 
            pa.prospect_id, 
            pa.corretor_fk,
            u.email as corretor_email,
            u.nome as corretor_nome,
            i.codigo as imovel_codigo,
            pa.expira_em,
            NOW() as db_now
          FROM imovel_prospect_atribuicoes pa
          JOIN users u ON u.id = pa.corretor_fk
          JOIN imovel_prospects ip ON ip.id = pa.prospect_id
          JOIN imoveis i ON i.id = ip.id_imovel
          WHERE pa.status = 'atribuido' 
            AND pa.expira_em < NOW()
          FOR UPDATE SKIP LOCKED
        `;
        const res = await pool.query(expiredQuery);
        console.log('Result count:', res.rowCount);
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
