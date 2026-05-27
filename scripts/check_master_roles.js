const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
    try {
        const res = await pool.query("SELECT * FROM user_roles WHERE level = 10 OR level = 6 OR name ILIKE '%master%' OR name ILIKE '%super%'");
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
