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
    const sql = `
      SELECT 
        f.name as feature_name, 
        c.name as category_name, 
        p.name as menu_parent 
      FROM system_features f 
      JOIN system_categorias c ON f.category_id = c.id 
      JOIN sidebar_menu_items s ON s.feature_id = f.id 
      JOIN sidebar_menu_items p ON s.parent_id = p.id 
      WHERE f.slug = 'usuarios'
    `;
    const res = await client.query(sql);
    console.log(res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
