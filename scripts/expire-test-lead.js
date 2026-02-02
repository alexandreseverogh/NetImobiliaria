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
        // Find a lead with status 'atribuido'
        const res = await pool.query("SELECT id, prospect_id FROM imovel_prospect_atribuicoes WHERE status = 'atribuido' ORDER BY created_at DESC LIMIT 1");

        if (res.rows.length === 0) {
            console.log('No assigned leads found to expire.');
            return;
        }

        const assignmentId = res.rows[0].id;
        console.log(`Expiring assignment ID: ${assignmentId} for prospect ${res.rows[0].prospect_id}`);

        // Update expira_em to 1 hour ago
        await pool.query("UPDATE imovel_prospect_atribuicoes SET expira_em = NOW() - INTERVAL '1 hour' WHERE id = $1", [assignmentId]);

        console.log('✅ Lead expired! Now you can trigger the transbordo API.');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
