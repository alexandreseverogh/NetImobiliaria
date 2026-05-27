const { Client } = require('pg');

async function checkData() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
  });

  try {
    await client.connect();
    
    // Check system_feature_modules
    const res = await client.query('SELECT COUNT(*) FROM system_feature_modules');
    console.log('system_feature_modules count:', res.rows[0].count);
    
    // Check system_features with category_id
    const res2 = await client.query('SELECT COUNT(*) FROM system_features WHERE category_id IS NOT NULL');
    console.log('system_features with category_id count:', res2.rows[0].count);

    // Check relationship
    const res3 = await client.query(`
      SELECT f.name as feature, c.name as category, m.name as module
      FROM system_features f
      JOIN system_categorias c ON f.category_id = c.id
      JOIN system_modules m ON c.module_id = m.id
      LIMIT 10
    `);
    console.log('Sample relationship (Module -> Category -> Feature):');
    console.table(res3.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkData();
