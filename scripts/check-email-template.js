
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
});

async function checkTemplate() {
    try {
        const res = await pool.query("SELECT id, name, subject, is_active FROM email_templates WHERE name = 'lead_accepted_owner_notification'");
        if (res.rows.length > 0) {
            console.log('✅ Template ENCONTRADO no banco de dados:');
            console.log(JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log('❌ Template NÃO encontrado.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkTemplate();
