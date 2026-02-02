const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function run() {
    try {
        const res = await pool.query("SELECT html_content FROM email_templates WHERE name = 'lead-expirado'");
        if (res.rows[0]) {
            const fs = require('fs');
            fs.writeFileSync('lead-expirado-template.html', res.rows[0].html_content);
            console.log('Template saved to lead-expirado-template.html');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
