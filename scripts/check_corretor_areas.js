
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
        // Check row count
        const res = await pool.query('SELECT count(*) FROM corretor_areas_atuacao');
        console.log('Row count:', res.rows[0].count);

        // Check Broker Users available
        const users = await pool.query("SELECT id, nome, email FROM users WHERE perfil_id = 4 OR perfil_id = 999 LIMIT 5"); // Assuming 4 is Corretor, 999 is Super Admin for test
        console.log('--- Potential Brokers ---');
        console.table(users.rows);

        // Check Schema
        const schema = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'corretor_areas_atuacao'");
        console.table(schema.rows);
    } catch (e) { console.error(e); }
    pool.end();
}
check();
