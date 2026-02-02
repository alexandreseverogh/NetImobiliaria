
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '15432'),
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function dump() {
    try {
        const res = await pool.query('SELECT * FROM email_templates');
        fs.writeFileSync('all_templates_full.json', JSON.stringify(res.rows, null, 2));
        console.log('Dumped ' + res.rows.length + ' templates.');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

dump();
