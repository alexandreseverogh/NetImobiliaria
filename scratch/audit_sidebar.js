const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'netimobiliaria',
  password: 'admin',
  port: 15432,
});

async function auditSidebar() {
  try {
    const featRes = await pool.query(`
      SELECT id, name, slug, url, category_id 
      FROM system_features 
      WHERE is_active = true 
      ORDER BY name
    `);
    
    const catRes = await pool.query(`
      SELECT id, name, module_id 
      FROM system_categorias 
      ORDER BY name
    `);

    console.log('=== AUDITORIA DE FUNCIONALIDADES ===');
    console.table(featRes.rows.map(f => ({
      id: f.id.substring(0, 8) + '...',
      name: f.name,
      url: f.url || '--- NULA ---',
      category_id: f.category_id
    })));

    console.log('\n=== AUDITORIA DE CATEGORIAS ===');
    console.table(catRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

auditSidebar();
