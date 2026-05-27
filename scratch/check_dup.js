const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'postgres',
  port: 15432,
});

async function checkLogicalDuplicates() {
  try {
    console.log('--- Verificando Duplicidade de Nomes ---');
    const res = await pool.query(`
      SELECT name, COUNT(*), ARRAY_AGG(id) as ids
      FROM system_features 
      GROUP BY name 
      HAVING COUNT(*) > 1
    `);
    console.table(res.rows);

    console.log('\n--- Verificando Proprietários Especificamente ---');
    const prop = await pool.query(`
      SELECT id, name, slug, category_id, url 
      FROM system_features 
      WHERE name ILIKE '%Proprietários%'
    `);
    console.table(prop.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkLogicalDuplicates();
