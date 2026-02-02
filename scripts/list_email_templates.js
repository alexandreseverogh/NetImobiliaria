require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
};

const pool = new Pool(poolConfig);

async function listTemplates() {
    try {
        console.log('Listing email templates (JSON)...');
        const res = await pool.query("SELECT name, subject, is_active FROM email_templates WHERE name LIKE '%lead%' OR name LIKE '%lost%' OR name LIKE '%sla%'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error listing templates:', err.message);
    } finally {
        pool.end();
    }
}

listTemplates();
