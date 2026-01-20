const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
});

async function fixBroker() {
    try {
        const brokerId = 'c57ab897-c068-46a4-9b12-bb9f2d938fe7';
        console.log(`🔧 Updating Broker ${brokerId} to 'Externo'...`);

        await pool.query("UPDATE users SET tipo_corretor = 'Externo' WHERE id = $1", [brokerId]);

        // Verify
        const res = await pool.query("SELECT tipo_corretor FROM users WHERE id = $1", [brokerId]);
        console.log('✅ New Status:', res.rows[0]);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await pool.end();
    }
}

fixBroker();
