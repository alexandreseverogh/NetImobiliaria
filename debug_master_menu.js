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
    
    console.log('--- Buscando Itens de Menu ---');
    const resItems = await client.query("SELECT id, name, parent_id, feature_id FROM sidebar_menu_items WHERE name ILIKE '%Master%' OR name ILIKE '%Governance%'");
    console.table(resItems.rows);

    console.log('--- Buscando Categorias ---');
    const resCats = await client.query("SELECT id, name FROM system_categorias WHERE name ILIKE '%Master%' OR name ILIKE '%Governance%'");
    console.table(resCats.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
