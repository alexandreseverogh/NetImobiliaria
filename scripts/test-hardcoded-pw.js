// Test PostgreSQL connection with hardcoded password
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres' // Hardcoded to bypass env vars
});

async function test() {
    try {
        console.log('Testing connection with password: postgres');
        const client = await pool.connect();
        console.log('✅ Connected successfully!');

        const result = await client.query('SELECT current_database(), current_user, version()');
        console.log('Database:', result.rows[0].current_database);
        console.log('User:', result.rows[0].current_user);
        console.log('Version:', result.rows[0].version.split(',')[0]);

        client.release();
        await pool.end();
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        await pool.end();
    }
}

test();
