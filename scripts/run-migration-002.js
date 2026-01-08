const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: false
});

async function runMigration() {
    const migrationPath = path.resolve(process.cwd(), 'database/migrations/002_fix_users_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('--- STARTING MIGRATION 002 (TARGET PORT: ' + process.env.DB_PORT + ') ---');
    try {
        await pool.query(sql);
        console.log('✅ Migration applied successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        pool.end();
    }
}

runMigration();
