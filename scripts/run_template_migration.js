require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
};

const pool = new Pool(poolConfig);

async function runMigration() {
    try {
        console.log('Running migration: insert_lead_perdido_sla.sql');
        const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'insert_lead_perdido_sla.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);
        console.log('✅ Migration applied successfully.');

        // Verify
        const res = await pool.query("SELECT name, subject, is_active FROM email_templates WHERE name = 'lead-perdido-sla'");
        console.log('Verification:', res.rows[0]);

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        pool.end();
    }
}

runMigration();
