require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '15432'),
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

const IMOVEL_ID = 66;

async function checkMotivo() {
    try {
        console.log(`Checking assignment for Imovel ${IMOVEL_ID}...`);

        const res = await pool.query(`
            SELECT 
                a.id, 
                a.status, 
                a.expira_em, 
                a.motivo,
                COALESCE(a.motivo->>'type','') as motivo_type,
                CASE WHEN (COALESCE(a.motivo->>'type','') = 'imovel_corretor_fk') THEN 'IGNORED' ELSE 'PROCESSABLE' END as worker_logic_check,
                NOW() as db_now,
                a.expira_em <= NOW() as is_expired
            FROM imovel_prospect_atribuicoes a
            JOIN imovel_prospects p ON a.prospect_id = p.id
            WHERE p.id_imovel = $1
            ORDER BY a.created_at DESC
            LIMIT 1
        `, [IMOVEL_ID]);

        console.table(res.rows);
        if (res.rows.length > 0) {
            console.log('Full JSON:', JSON.stringify(res.rows[0].motivo, null, 2));
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkMotivo();
