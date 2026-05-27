const { Client } = require('pg');

async function main() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432
  });

  try {
    await client.connect();
    const tables = ['sidebar_menu_items', 'system_features', 'system_categorias'];
    for (const table of tables) {
      console.log(`--- Table: ${table} ---`);
      const res = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}'`);
      console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
