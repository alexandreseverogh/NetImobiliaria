const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'netimobiliaria',
  password: 'admin',
  port: 15432,
});

async function checkProprietarios() {
  try {
    const res = await pool.query(`
      SELECT sf.id, sf.name, sf.slug, sf.url, sf.category_id, sc.name as category_name
      FROM system_features sf
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE sf.name ILIKE '%Proprietários%'
    `);
    console.log('--- Funcionalidade Proprietários ---');
    console.table(res.rows);
    
    const sidebarRes = await pool.query(`
      SELECT id, name, module_id FROM system_categorias ORDER BY name
    `);
    console.log('\n--- Categorias Existentes ---');
    console.table(sidebarRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkProprietarios();
