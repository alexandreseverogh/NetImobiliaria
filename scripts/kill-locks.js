const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
});

async function killLock() {
    try {
        const blockingPid = 21068; // Hardcoded from previous log
        console.log(`💀 Killing Blocking PID: ${blockingPid}`);

        // Use pg_terminate_backend
        const res = await pool.query('SELECT pg_terminate_backend($1)', [blockingPid]);

        if (res.rows[0].pg_terminate_backend) {
            console.log('✅ Successfully terminated blocking process.');
        } else {
            console.log('❌ Failed to terminate process (maybe it finished?).');
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await pool.end();
    }
}

killLock();
