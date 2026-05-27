const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'netimobiliaria',
  password: 'admin',
  port: 15432,
});

async function checkIds() {
  try {
    const res = await pool.query(`
      SELECT 'FEATURE' as type, id, name FROM system_features WHERE name ILIKE '%Proprietários%'
      UNION ALL
      SELECT 'CATEGORY' as type, id, name FROM system_categorias WHERE id IN (
        SELECT category_id FROM system_features WHERE name ILIKE '%Proprietários%'
      )
      OR id < 100 -- Pegar as primeiras categorias para comparação
      LIMIT 20
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkIds();
