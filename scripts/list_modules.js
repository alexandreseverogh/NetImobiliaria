const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
    try {
        const res = await pool.query("SELECT id, name, slug FROM system_modules");
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
