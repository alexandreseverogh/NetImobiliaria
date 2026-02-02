const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    try {
        console.log('Terminating stuck backends...');
        const q = `
            SELECT pg_terminate_backend(pid), pid, query, state, query_start
            FROM pg_stat_activity 
            WHERE state != 'idle' 
              AND query_start < NOW() - INTERVAL '5 minutes'
              AND pid != pg_backend_pid()
        `;
        const res = await pool.query(q);
        console.log('Terminated PIDs:', JSON.stringify(res.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
