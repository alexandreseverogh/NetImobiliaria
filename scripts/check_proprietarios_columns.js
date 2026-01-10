
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
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'proprietarios' ORDER BY column_name");
        const columns = res.rows.map(r => r.column_name);
        console.log('Columns in proprietarios:', columns.join(', '));
        console.log('Has corretor_fk:', columns.includes('corretor_fk'));
    } catch (e) { console.error(e); }
    pool.end();
}
check();
