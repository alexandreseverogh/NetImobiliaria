
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function check() {
    try {
        const res = await pool.query("SELECT id, nome, tipo_corretor FROM users WHERE id = '4d456e42-4031-46ba-9b5c-912bec1d28b5'");

        if (res.rows.length > 0) {
            console.log('--- Broker Data ---');
            console.log('Name:', res.rows[0].nome);
            console.log('Type:', res.rows[0].tipo_corretor);
        } else {
            console.log('Broker not found');
        }
    } catch (e) { console.error(e); }
    pool.end();
}
check();
