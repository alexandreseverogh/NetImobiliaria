const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'netimobiliaria',
  password: 'admin',
  port: 15432,
});

async function findCollisions() {
  try {
    console.log('--- Verificando Categorias ---');
    const cats = await pool.query('SELECT id, name, slug FROM system_categorias ORDER BY id');
    console.table(cats.rows);

    console.log('\n--- Verificando Funcionalidade Proprietários ---');
    const feat = await pool.query("SELECT id, name, slug, url, category_id FROM system_features WHERE name ILIKE '%Proprietários%'");
    console.table(feat.rows);

    // Verificar se existe alguma categoria com o mesmo nome da funcionalidade
    const overlap = await pool.query("SELECT id, name FROM system_categorias WHERE name ILIKE '%Proprietários%'");
    if (overlap.rows.length > 0) {
      console.log('\n⚠️ ALERTA: Existe uma CATEGORIA com o nome Proprietários!');
      console.table(overlap.rows);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findCollisions();
