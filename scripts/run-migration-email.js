
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Executando migration de email...');

        const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '006_adjust_email_content.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        console.log('✅ Migration de email executada com sucesso!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao executar migration:', err);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
