require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
};

const pool = new Pool(poolConfig);

async function checkSpecificLog() {
    try {
        console.log("Searching for 'lead-perdido-sla' logs...");
        const res = await pool.query(`
            SELECT id, sent_at, to_email, success 
            FROM email_logs 
            WHERE template_name = 'lead-perdido-sla'
            ORDER BY sent_at DESC
            LIMIT 5
        `);
        console.table(res.rows);

        if (res.rows.length > 0) {
            console.log("✅ Evidence found: Template WAS working recently.");
        } else {
            console.log("❌ No evidence found: Template usage not logged.");
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

checkSpecificLog();
