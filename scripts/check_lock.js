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

async function checkLock() {
    const client = await pool.connect();
    try {
        console.log(`Checking Lock for Imovel ${IMOVEL_ID}...`);

        await client.query('BEGIN');

        // Find the specific assignment ID first
        const finder = await client.query(`
            SELECT a.id, a.expira_em 
            FROM imovel_prospect_atribuicoes a
            JOIN imovel_prospects p ON a.prospect_id = p.id
            WHERE p.id_imovel = $1
            ORDER BY a.created_at DESC LIMIT 1
        `, [IMOVEL_ID]);

        if (finder.rows.length === 0) { console.log('No assignment found'); return; }

        const id = finder.rows[0].id;
        console.log(`Trying to lock Assignment ID: ${id}`);

        try {
            await client.query(`SELECT id FROM imovel_prospect_atribuicoes WHERE id = $1 FOR UPDATE NOWAIT`, [id]);
            console.log("✅ Lock acquired successfully! (Row is NOT locked by another transaction)");
        } catch (e) {
            console.error("❌ Lock FAILED! Row is currently locked by another transaction.", e.message);
        }

        await client.query('ROLLBACK');

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

checkLock();
