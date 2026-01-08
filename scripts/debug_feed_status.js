const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'Roberto@2007',
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function check() {
    const client = await pool.connect();
    try {
        console.log('--- COLUMNS ---');
        const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'feed' AND table_name = 'feed_jobs'");
        console.log(cols.rows.map(r => r.column_name).join(', '));

        console.log('\n--- RECENT JOBS (Attempting safe select) ---');
        // Selecting * is safer for debug than guessing columns
        const jobs = await client.query('SELECT * FROM feed.feed_jobs ORDER BY created_at DESC LIMIT 5');
        console.log(JSON.stringify(jobs.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}

check();
