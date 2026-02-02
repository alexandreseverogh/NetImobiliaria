
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '15432'),
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function checkLogs() {
    try {
        const res = await pool.query("SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 1");
        if (res.rows[0]) console.log('COLUMNS:', Object.keys(res.rows[0]));
        console.log('CONTENT:', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkLogs();
