const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: '127.0.0.1', port: 15432, user: 'postgres', password: 'postgres', database: 'net_imobiliaria'
});

async function run() {
    try {
        const res = await pool.query("SELECT id, name, url, resource, parent_id FROM sidebar_menu_items");
        let txt = '';
        res.rows.forEach(r => {
            txt += `${r.id} | ${r.name} | ${r.url} | ${r.resource} | ${r.parent_id}\n`;
        });
        fs.writeFileSync('sidebar_dump.txt', txt);
    } catch (e) {
        fs.writeFileSync('sidebar_dump.txt', 'ERRO: ' + e.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}
run();
