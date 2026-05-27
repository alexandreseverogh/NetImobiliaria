const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria'
});

async function run() {
  try {
    const res = await pool.query('SELECT id, name, url, parent_id FROM sidebar_menu_items WHERE is_active = true ORDER BY order_index');
    fs.writeFileSync('menu_debug_final.json', JSON.stringify(res.rows, null, 2));
    console.log('Arquivo menu_debug_final.json gerado com sucesso!');
  } catch (err) {
    fs.writeFileSync('menu_debug_error.txt', err.message);
  } finally {
    await pool.end();
  }
}

run();
