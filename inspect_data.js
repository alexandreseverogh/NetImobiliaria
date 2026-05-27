const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: '127.0.0.1', port: 15432, user: 'postgres', password: 'postgres', database: 'net_imobiliaria'
});

async function run() {
    try {
        const res = await pool.query("SELECT id, name, url, resource, parent_id FROM sidebar_menu_items LIMIT 50");
        fs.writeFileSync('sidebar_data.txt', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        fs.writeFileSync('sidebar_data.txt', 'ERRO: ' + e.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}
run();
