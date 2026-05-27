const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'netimobiliaria',
  password: 'admin',
  port: 15432,
});

async function debugProprietarios() {
  try {
    const res = await pool.query(`
      SELECT id, name, slug, url, category_id, is_active 
      FROM system_features 
      WHERE name ILIKE '%Proprietários%'
    `);
    
    if (res.rows.length === 0) {
      console.log('❌ Funcionalidade "Proprietários" NÃO ENCONTRADA!');
    } else {
      console.log('✅ Funcionalidade encontrada:');
      console.table(res.rows);
    }

    const catRes = await pool.query(`
      SELECT id, name FROM system_categorias WHERE name ILIKE '%Parâmetros%'
    `);
    console.log('\n✅ Categoria "Parâmetros" encontrada:');
    console.table(catRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

debugProprietarios();
