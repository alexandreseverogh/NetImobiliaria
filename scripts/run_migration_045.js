
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function runMigration() {
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(path.join(__dirname, '../database/migrations/045_add_corretor_fk_imoveis.sql'), 'utf8');
        console.log('Running migration 045...');
        await client.query(sql);
        console.log('Migration 045 completed successfully.');
    } catch (err) {
        console.error('Error running migration 045:', err);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
