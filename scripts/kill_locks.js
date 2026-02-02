require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '15432'),
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function killConnections() {
    try {
        console.log('Killing idle transactions...');
        const res = await pool.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE state = 'idle in transaction'
              AND datname = current_database()
              AND pid <> pg_backend_pid();
        `);
        console.log(`Terminated ${res.rows.length} idle transactions.`);

        // Also check if any active query matches my scripts
        const blocked = await pool.query(`
            SELECT pid, query, state, age(query_start) 
            FROM pg_stat_activity 
            WHERE state != 'idle' 
            AND pid <> pg_backend_pid();
        `);
        console.table(blocked.rows);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

killConnections();
