const { pool } = require('./utils/db.js');

(async () => {
    try {
        console.log('⏳ Connecting to database...');
        const client = await pool.connect();
        const res = await client.query('SELECT current_database() as db, inet_server_port() as port');
        const configuredPort = process.env.DB_PORT || process.env.POSTGRES_PORT || 'unknown';
        console.log(`✅ CONNECTED: ${res.rows[0].db} (Server Port: ${res.rows[0].port}, Configured Port: ${configuredPort})`);

        if (res.rows[0].db !== 'net_imobiliaria') {
            console.error(`❌ DATABASE MISMATCH: Expected 'net_imobiliaria', got '${res.rows[0].db}'`);
            process.exit(1);
        }

        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ CONNECTION ERROR:', err.message);
        process.exit(1);
    }
})();
