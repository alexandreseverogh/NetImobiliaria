const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
});

async function checkLocks() {
    try {
        console.log('--- CHECKING ACTIVE LOCKS ---');

        // Query to find blocking activity
        const q = `
      SELECT 
        pid, 
        usename, 
        pg_blocking_pids(pid) as blocked_by, 
        query as query_snippet, 
        state, 
        age(clock_timestamp(), query_start) as duration
      FROM pg_stat_activity 
      WHERE state != 'idle' 
        AND pid <> pg_backend_pid()
      ORDER BY duration DESC;
    `;

        const res = await pool.query(q);

        if (res.rows.length === 0) {
            console.log('✅ No active/blocking queries found.');
        } else {
            console.log('⚠️ Active Transactions/Queries:', res.rows.length);
            res.rows.forEach(r => {
                console.log(`\nPID: ${r.pid} | User: ${r.usename} | State: ${r.state}`);
                console.log(`Blocked By: ${r.blocked_by} | Duration: ${r.duration.seconds || r.duration}s`);
                console.log(`Query: ${r.query_snippet.substring(0, 100)}...`);
            });
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await pool.end();
    }
}

checkLocks();
