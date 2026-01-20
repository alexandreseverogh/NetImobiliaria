
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
});

async function dumpTemplates() {
    try {
        const res = await pool.query("SELECT id, name, html_content FROM email_templates WHERE id IN (12, 13, 17) OR name = 'lead_accepted_client_notification'");
        fs.writeFileSync('templates_dump.json', JSON.stringify(res.rows, null, 2));
        console.log('Templates dumped to templates_dump.json');
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

dumpTemplates();
